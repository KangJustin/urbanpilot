const { callAgentRaw } = require('../services/claudeService');
const { getTransitMetrics } = require('../services/transit511Service');
const { parseAccessibilityAgentJson, buildAccessibilityFallback } = require('../services/accessibilityAgentParser');
const { compactRiskRecSchema, compactKeyValueLine } = require('../services/promptCompression');

const ACCESSIBILITY_MODEL = 'claude-haiku-4-5-20251001';
const ACCESSIBILITY_MAX_TOKENS = 2048;

const SYSTEM = `You are an expert urban accessibility analyst for urban planning. \
You analyze walkability, ADA and mobility barriers, transit access, bicycle connectivity, \
pedestrian safety, and proximity to essential services. \
When verified 511 SF Bay Regional GTFS transit metrics are provided, you MUST cite those exact numbers \
in summary and findings (e.g. "28 transit stops within 800m (511 SF Bay Regional GTFS)"). \
Do NOT invent or override verified transit statistics. \
Copy transitData numeric fields exactly from the prompt when transitAvailable is true. \
Return ONLY one valid JSON object matching the schema exactly. \
No markdown, no code fences, no commentary before or after the JSON.`;

function formatTransitBlock(transitData) {
  if (!transitData) return '';
  const hub = transitData.nearestHub?.name
    ? `${transitData.nearestHub.name}(${transitData.nearestHub.distanceM}m)`
    : 'none';
  return `511GTFS: ${compactKeyValueLine([
    ['stops400', transitData.nearbyStops400m],
    ['stops800', transitData.nearbyStops800m],
    ['routes800', transitData.uniqueRoutes800m],
    ['ops', (transitData.operators800m || []).join(',') || 'none'],
    ['modes', (transitData.modes800m || []).join(',') || 'none'],
    ['nearest', transitData.nearestStopM != null ? `${transitData.nearestStopM}m` : null],
    ['hub', hub],
  ])} (${transitData.source})`;
}

function buildVerifiedTransitPayload(transitData) {
  const { geography, nearestStops, ...metrics } = transitData;
  return {
    nearbyStops400m: metrics.nearbyStops400m,
    nearbyStops800m: metrics.nearbyStops800m,
    uniqueRoutes800m: metrics.uniqueRoutes800m,
    operators800m: metrics.operators800m,
    modes800m: metrics.modes800m,
    nearestStopM: metrics.nearestStopM,
    nearestHub: metrics.nearestHub || {},
    source: metrics.source,
    verified: true,
    geography,
    nearestStops: nearestStops || [],
  };
}

function buildTransitDataSchema(transitResult) {
  if (!transitResult.transitAvailable) return 'null';
  return JSON.stringify(buildVerifiedTransitPayload(transitResult.transitData));
}

function buildResponseSchema(transitResult) {
  const transitDataSchema = buildTransitDataSchema(transitResult);
  return `{"score":<0-100>,"summary":"<2-3 sentences, cite verified transit metrics if available>",`
    + `${compactRiskRecSchema('a', 'accessibility')},`
    + `"transitAvailable":${transitResult.transitAvailable},"transitData":${transitDataSchema}}`;
}

async function fetchTransitMetrics(site) {
  const { latitude, longitude } = site.center || {};
  if (latitude == null || longitude == null) {
    return { transitAvailable: false };
  }

  try {
    const result = await getTransitMetrics(latitude, longitude);
    return result;
  } catch (err) {
    console.warn('[accessibility] 511 GTFS lookup failed, continuing without transit data:', err.message);
    return { transitAvailable: false };
  }
}

function attachVerifiedTransit(agentResult, transitResult) {
  if (!transitResult.transitAvailable) {
    return {
      ...agentResult,
      transitAvailable: false,
      transitData: null,
    };
  }

  return {
    ...agentResult,
    transitAvailable: true,
    transitData: buildVerifiedTransitPayload(transitResult.transitData),
  };
}

async function callAccessibilityClaude(prompt) {
  const { text, stopReason } = await callAgentRaw(
    SYSTEM,
    prompt,
    ACCESSIBILITY_MODEL,
    ACCESSIBILITY_MAX_TOKENS,
  );
  console.log('[accessibility] Claude stop_reason:', stopReason);
  console.log('[accessibility] Raw Claude response:\n', text);
  return text;
}

async function analyzeAccessibility({ site, goal }) {
  const transitResult = await fetchTransitMetrics(site);
  const transitBlock = transitResult.transitAvailable
    ? formatTransitBlock(transitResult.transitData)
    : 'No verified 511 SF Bay transit data available for this location — note that transit access statistics in findings are estimates.';

  const responseSchema = buildResponseSchema(transitResult);

  const prompt = `Analyze accessibility/mobility. Site: ${site.name} (${site.center.latitude}, ${site.center.longitude}). `
    + `Goal: ${goal.description}\n\nVerified data — ${transitBlock}\n\n`
    + `Cite verified numbers exactly; label walkability/bike/ADA analysis as estimates. `
    + `If transitAvailable, copy transitData values from the schema unchanged.\n\n`
    + `Return one JSON object, this exact shape, no other text:\n${responseSchema}`;

  let rawText;
  try {
    rawText = await callAccessibilityClaude(prompt);
  } catch (err) {
    console.error('[accessibility] Claude API call failed:', err.message);
    return attachVerifiedTransit(
      buildAccessibilityFallback({ site, goal, transitResult, rawText: null, parseError: err.message }),
      transitResult,
    );
  }

  const { parsed, strategy, attempts } = parseAccessibilityAgentJson(rawText);
  console.log('[accessibility] JSON parse strategy:', strategy || 'failed');
  if (!parsed) {
    const lastError = attempts.find((a) => !a.ok)?.error || 'Unknown parse error';
    console.error('[accessibility] JSON parse failed:', lastError);
    return attachVerifiedTransit(
      buildAccessibilityFallback({ site, goal, transitResult, rawText, parseError: lastError }),
      transitResult,
    );
  }

  console.log('[accessibility] Parsed JSON:', JSON.stringify(parsed, null, 2));

  const { transitData: _ignoredData, transitAvailable: _ignoredFlag, ...interpretation } = parsed;
  return attachVerifiedTransit(interpretation, transitResult);
}

module.exports = {
  analyzeAccessibility,
  buildResponseSchema,
  formatTransitBlock,
  buildVerifiedTransitPayload,
};
