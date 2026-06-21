const { callAgentRaw } = require('../services/claudeService');
const { getOpenMeteoClimateMetrics } = require('../services/openMeteoService');
const { parseClimateAgentJson, buildClimateFallback } = require('../services/climateAgentParser');

const CLIMATE_MODEL = 'claude-haiku-4-5-20251001';
const CLIMATE_MAX_TOKENS = 2048;

const SYSTEM = `You are an expert climate resilience analyst for urban planning. \
You analyze urban heat island exposure, flooding and stormwater risk, tree canopy coverage, \
impervious surface area, and green infrastructure potential. \
When verified Open-Meteo current weather and US AQI metrics are provided, you MUST cite those exact values \
in summary and findings (e.g. "Current temperature: 62°F, US AQI 42 (Good)"). \
Do NOT invent or override verified Open-Meteo statistics. \
Copy climateData numeric fields exactly from the prompt when climateAvailable is true. \
Heat island severity, flood risk, tree canopy %, impervious surface, and long-term climate projections \
are AI estimates unless explicitly marked as verified — distinguish them clearly from current weather/AQI. \
Return ONLY one valid JSON object matching the schema exactly. \
No markdown, no code fences, no commentary before or after the JSON.`;

function formatClimateBlock(climateData) {
  if (!climateData) return '';
  const temp = climateData.temperatureF != null
    ? `${Math.round(climateData.temperatureF)}°F`
    : 'N/A';
  return `
Verified Open-Meteo current conditions (${climateData.source?.join(' + ') || 'Open-Meteo'}):
- Current temperature: ${temp}
- Weather code: ${climateData.weatherCode ?? 'N/A'} (${climateData.weatherDescription || 'Unknown'})
- US AQI: ${climateData.usAqi ?? 'N/A'} (${climateData.aqiCategory || 'N/A'})
${climateData.observedAt ? `- Observed at: ${climateData.observedAt}` : ''}
`.trim();
}

function buildVerifiedClimatePayload(climateData) {
  const { timezone, observedAt, ...metrics } = climateData;
  return {
    temperatureF: metrics.temperatureF,
    weatherCode: metrics.weatherCode,
    weatherDescription: metrics.weatherDescription,
    usAqi: metrics.usAqi,
    aqiCategory: metrics.aqiCategory,
    source: metrics.source,
    verified: true,
    observedAt: observedAt || null,
    timezone: timezone || null,
  };
}

function buildClimateDataSchema(climateResult) {
  if (!climateResult.climateAvailable) return 'null';
  return JSON.stringify(buildVerifiedClimatePayload(climateResult.climateData), null, 2);
}

function buildResponseSchema(climateResult) {
  const climateDataSchema = buildClimateDataSchema(climateResult);
  return `{
  "score": 0,
  "summary": "string — 2-3 sentences citing verified Open-Meteo temperature and AQI when available",
  "findings": [
    "string — include verified current temperature and US AQI where relevant",
    "string — heat/flood/canopy findings must be labeled as estimates if not verified",
    "string",
    "string"
  ],
  "risks": [
    {
      "id": "cr1",
      "title": "string",
      "description": "string",
      "severity": 3,
      "category": "climate"
    },
    {
      "id": "cr2",
      "title": "string",
      "description": "string",
      "severity": 2,
      "category": "climate"
    }
  ],
  "recommendations": [
    {
      "id": "crec1",
      "title": "string",
      "description": "string",
      "cost": "low",
      "timeline": "short_term",
      "priority": 1,
      "impact": { "climate": 0, "accessibility": 0, "housing": 0, "equity": 0 }
    },
    {
      "id": "crec2",
      "title": "string",
      "description": "string",
      "cost": "medium",
      "timeline": "medium_term",
      "priority": 2,
      "impact": { "climate": 0, "accessibility": 0, "housing": 0, "equity": 0 }
    }
  ],
  "climateAvailable": ${climateResult.climateAvailable},
  "climateData": ${climateResult.climateAvailable ? climateDataSchema : 'null'}
}`;
}

async function fetchClimateMetrics(site) {
  const { latitude, longitude } = site.center || {};
  if (latitude == null || longitude == null) {
    return { climateAvailable: false };
  }

  try {
    return await getOpenMeteoClimateMetrics(latitude, longitude);
  } catch (err) {
    console.warn('[climate] Open-Meteo lookup failed, continuing without climate data:', err.message);
    return { climateAvailable: false };
  }
}

function attachVerifiedClimate(agentResult, climateResult) {
  if (!climateResult.climateAvailable) {
    return {
      ...agentResult,
      climateAvailable: false,
      climateData: null,
    };
  }

  return {
    ...agentResult,
    climateAvailable: true,
    climateData: buildVerifiedClimatePayload(climateResult.climateData),
  };
}

async function callClimateClaude(prompt) {
  const { text, stopReason } = await callAgentRaw(
    SYSTEM,
    prompt,
    CLIMATE_MODEL,
    CLIMATE_MAX_TOKENS,
  );
  console.log('[climate] Claude stop_reason:', stopReason);
  console.log('[climate] Raw Claude response:\n', text);
  return text;
}

async function analyzeClimate({ site, goal }) {
  const climateResult = await fetchClimateMetrics(site);
  const climateBlock = climateResult.climateAvailable
    ? formatClimateBlock(climateResult.climateData)
    : 'No verified Open-Meteo weather/AQI data available for this location — note that current conditions in findings are estimates.';

  const responseSchema = buildResponseSchema(climateResult);

  const prompt = `Analyze climate resilience for this site and planning goal.

Site: ${site.name} (${site.center.latitude}, ${site.center.longitude})
Planning goal: ${goal.description}

${climateBlock}

Use your knowledge of this specific location and its regional climate conditions. \
Do not substitute another city's characteristics unless the site is actually there.

Use verified Open-Meteo temperature and US AQI exactly where provided. For urban heat island exposure, \
flooding/stormwater risk, tree canopy, impervious surface, and green infrastructure recommendations, \
apply planning expertise but clearly label those as estimates distinct from verified current weather/AQI.

When climateAvailable is true, copy climateData numeric values exactly from the schema below — do not modify them.

Return exactly one JSON object matching this schema (replace placeholder strings and score with your analysis):
${responseSchema}`;

  let rawText;
  try {
    rawText = await callClimateClaude(prompt);
  } catch (err) {
    console.error('[climate] Claude API call failed:', err.message);
    return attachVerifiedClimate(
      buildClimateFallback({ site, goal, climateResult, rawText: null, parseError: err.message }),
      climateResult,
    );
  }

  const { parsed, strategy, attempts } = parseClimateAgentJson(rawText);
  console.log('[climate] JSON parse strategy:', strategy || 'failed');
  if (!parsed) {
    const lastError = attempts.find((a) => !a.ok)?.error || 'Unknown parse error';
    console.error('[climate] JSON parse failed:', lastError);
    return attachVerifiedClimate(
      buildClimateFallback({ site, goal, climateResult, rawText, parseError: lastError }),
      climateResult,
    );
  }

  console.log('[climate] Parsed JSON:', JSON.stringify(parsed, null, 2));

  const { climateData: _ignoredData, climateAvailable: _ignoredFlag, ...interpretation } = parsed;
  return attachVerifiedClimate(interpretation, climateResult);
}

module.exports = {
  analyzeClimate,
  buildResponseSchema,
  formatClimateBlock,
  buildVerifiedClimatePayload,
};
