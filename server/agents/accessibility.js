const { callAgentRaw } = require('../services/claudeService');
const { getTransitMetrics } = require('../services/transit511Service');
const { parseAccessibilityAgentJson, buildAccessibilityFallback } = require('../services/accessibilityAgentParser');

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
    ? `${transitData.nearestHub.name} (${transitData.nearestHub.distanceM}m)`
    : 'none within 800m';
  return `
Verified 511 SF Bay Regional GTFS transit metrics (${transitData.source}):
- Nearby transit stops within 400m: ${transitData.nearbyStops400m}
- Nearby transit stops within 800m: ${transitData.nearbyStops800m}
- Unique routes within 800m: ${transitData.uniqueRoutes800m}
- Operators within 800m: ${(transitData.operators800m || []).join(', ') || 'none'}
- Transit modes within 800m: ${(transitData.modes800m || []).join(', ') || 'none'}
- Distance to nearest stop: ${transitData.nearestStopM}m
- Nearest transit hub (station): ${hub}
`.trim();
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
  return JSON.stringify(buildVerifiedTransitPayload(transitResult.transitData), null, 2);
}

function buildResponseSchema(transitResult) {
  const transitDataSchema = buildTransitDataSchema(transitResult);
  return `{
  "score": 0,
  "summary": "string — 2-3 sentences citing verified 511 GTFS metrics when available",
  "findings": [
    "string — include verified transit stop counts and modes where relevant",
    "string",
    "string",
    "string"
  ],
  "risks": [
    {
      "id": "ar1",
      "title": "string",
      "description": "string",
      "severity": 3,
      "category": "accessibility"
    },
    {
      "id": "ar2",
      "title": "string",
      "description": "string",
      "severity": 2,
      "category": "accessibility"
    }
  ],
  "recommendations": [
    {
      "id": "arec1",
      "title": "string",
      "description": "string",
      "cost": "medium",
      "timeline": "short_term",
      "priority": 1,
      "impact": { "climate": 0, "accessibility": 0, "housing": 0, "equity": 0 }
    },
    {
      "id": "arec2",
      "title": "string",
      "description": "string",
      "cost": "low",
      "timeline": "short_term",
      "priority": 2,
      "impact": { "climate": 0, "accessibility": 0, "housing": 0, "equity": 0 }
    }
  ],
  "transitAvailable": ${transitResult.transitAvailable},
  "transitData": ${transitResult.transitAvailable ? transitDataSchema : 'null'}
}`;
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

  const prompt = `Analyze accessibility and mobility for this site and planning goal.

Site: ${site.name} (${site.center.latitude}, ${site.center.longitude})
Planning goal: ${goal.description}

${transitBlock}

Use your knowledge of this specific location, its transit infrastructure, and street network. \
Do not substitute another city's characteristics unless the site is actually there. \
Use verified 511 GTFS numbers exactly where provided. For walkability, bike connectivity, pedestrian safety, \
and ADA barriers, apply planning expertise but clearly distinguish estimates from verified transit figures.

When transitAvailable is true, copy transitData numeric values exactly from the schema below — do not modify them.

Return exactly one JSON object matching this schema (replace placeholder strings and score with your analysis):
${responseSchema}`;

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
