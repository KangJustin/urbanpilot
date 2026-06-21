const { callAgentRaw } = require('../services/claudeService');
const { getOpenMeteoClimateMetrics, SOURCE: OPEN_METEO_SOURCES } = require('../services/openMeteoService');
const { getFemaFloodMetrics, SOURCE: FEMA_SOURCE } = require('../services/femaNfhlService');
const { parseClimateAgentJson, buildClimateFallback } = require('../services/climateAgentParser');

const CLIMATE_MODEL = 'claude-haiku-4-5-20251001';
const CLIMATE_MAX_TOKENS = 2048;

const SYSTEM = `You are an expert climate resilience analyst for urban planning. \
You analyze urban heat island exposure, flooding and stormwater risk, tree canopy coverage, \
impervious surface area, and green infrastructure potential. \
When verified Open-Meteo current weather and US AQI metrics are provided, you MUST cite those exact values \
in summary and findings (e.g. "Current temperature: 62°F, US AQI 42 (Good)"). \
When verified FEMA NFHL flood zone data is provided, you MUST cite the exact flood zone, flood risk level, \
and SFHA status (e.g. "FEMA flood zone X, Minimal risk, not in Special Flood Hazard Area"). \
Do NOT invent or override verified Open-Meteo or FEMA statistics. \
Copy climateData numeric and string fields exactly from the prompt when climateAvailable is true. \
Heat island severity, tree canopy %, impervious surface, drought, and long-term climate projections \
are AI estimates unless explicitly marked as verified — distinguish them clearly from verified weather/AQI/FEMA data. \
Return ONLY one valid JSON object matching the schema exactly. \
No markdown, no code fences, no commentary before or after the JSON.`;

function formatClimateBlock(climateData) {
  if (!climateData) return '';

  const lines = [];
  const hasOpenMeteo = climateData.temperatureF != null || climateData.usAqi != null;
  const hasFema = climateData.femaFloodZone != null;

  if (hasOpenMeteo) {
    const temp = climateData.temperatureF != null
      ? `${Math.round(climateData.temperatureF)}°F`
      : 'N/A';
    lines.push(`Verified Open-Meteo current conditions:`);
    lines.push(`- Current temperature: ${temp}`);
    lines.push(`- Weather code: ${climateData.weatherCode ?? 'N/A'} (${climateData.weatherDescription || 'Unknown'})`);
    lines.push(`- US AQI: ${climateData.usAqi ?? 'N/A'} (${climateData.aqiCategory || 'N/A'})`);
    if (climateData.observedAt) lines.push(`- Observed at: ${climateData.observedAt}`);
  }

  if (hasFema) {
    lines.push('');
    lines.push(`Verified FEMA National Flood Hazard Layer (${FEMA_SOURCE}):`);
    lines.push(`- Flood zone: ${climateData.femaFloodZone}`);
    lines.push(`- Flood risk: ${climateData.femaFloodRisk}`);
    lines.push(`- In Special Flood Hazard Area (SFHA): ${climateData.inSpecialFloodHazardArea ? 'Yes' : 'No'}`);
    lines.push(`- Base flood elevation (ft): ${climateData.baseFloodElevationFt ?? 'N/A'}`);
  }

  return lines.join('\n').trim();
}

function buildVerifiedClimatePayload(climateData) {
  const payload = {
    verified: true,
    source: climateData.source || [],
  };

  if (climateData.temperatureF != null) payload.temperatureF = climateData.temperatureF;
  if (climateData.weatherCode != null) payload.weatherCode = climateData.weatherCode;
  if (climateData.weatherDescription != null) payload.weatherDescription = climateData.weatherDescription;
  if (climateData.usAqi != null) payload.usAqi = climateData.usAqi;
  if (climateData.aqiCategory != null) payload.aqiCategory = climateData.aqiCategory;
  if (climateData.observedAt != null) payload.observedAt = climateData.observedAt;
  if (climateData.timezone != null) payload.timezone = climateData.timezone;

  if (climateData.femaFloodZone != null) {
    payload.femaFloodZone = climateData.femaFloodZone;
    payload.femaFloodRisk = climateData.femaFloodRisk;
    payload.inSpecialFloodHazardArea = climateData.inSpecialFloodHazardArea;
    payload.baseFloodElevationFt = climateData.baseFloodElevationFt ?? null;
  }

  return payload;
}

function buildClimateDataSchema(climateResult) {
  if (!climateResult.climateAvailable) return 'null';
  return JSON.stringify(buildVerifiedClimatePayload(climateResult.climateData), null, 2);
}

function buildResponseSchema(climateResult) {
  const climateDataSchema = buildClimateDataSchema(climateResult);
  return `{
  "score": 0,
  "summary": "string — 2-3 sentences citing verified Open-Meteo temperature/AQI and FEMA flood zone when available",
  "findings": [
    "string — include verified current temperature, US AQI, and FEMA flood zone where relevant",
    "string — heat/canopy/impervious findings must be labeled as estimates if not verified",
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

function mergeClimateMetrics(openMeteoResult, femaResult) {
  const hasOpenMeteo = openMeteoResult?.climateAvailable && openMeteoResult.climateData;
  const hasFema = femaResult?.femaAvailable && femaResult.femaData;

  if (!hasOpenMeteo && !hasFema) {
    return { climateAvailable: false, climateData: null };
  }

  const source = [];
  const climateData = { verified: true };

  if (hasOpenMeteo) {
    Object.assign(climateData, openMeteoResult.climateData);
    source.push(...(openMeteoResult.climateData.source || OPEN_METEO_SOURCES));
  }

  if (hasFema) {
    const f = femaResult.femaData;
    climateData.femaFloodZone = f.floodZone;
    climateData.femaFloodRisk = f.floodRisk;
    climateData.inSpecialFloodHazardArea = f.inSpecialFloodHazardArea;
    climateData.baseFloodElevationFt = f.baseFloodElevationFt;
    if (!source.includes(FEMA_SOURCE)) source.push(FEMA_SOURCE);
  }

  climateData.source = source;

  return { climateAvailable: true, climateData, femaAvailable: !!hasFema };
}

async function fetchClimateMetrics(site) {
  const { latitude, longitude } = site.center || {};
  if (latitude == null || longitude == null) {
    return { climateAvailable: false };
  }

  const [openMeteoResult, femaResult] = await Promise.all([
    getOpenMeteoClimateMetrics(latitude, longitude).catch((err) => {
      console.warn('[climate] Open-Meteo lookup failed, continuing without weather/AQI:', err.message);
      return { climateAvailable: false, climateData: null };
    }),
    getFemaFloodMetrics(latitude, longitude).catch((err) => {
      console.warn('[climate] FEMA NFHL lookup failed, continuing without flood zone:', err.message);
      return { femaAvailable: false, femaData: null };
    }),
  ]);

  return mergeClimateMetrics(openMeteoResult, femaResult);
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
    : 'No verified Open-Meteo weather/AQI or FEMA flood zone data available for this location — note that conditions and flood findings are estimates.';

  const responseSchema = buildResponseSchema(climateResult);

  const prompt = `Analyze climate resilience for this site and planning goal.

Site: ${site.name} (${site.center.latitude}, ${site.center.longitude})
Planning goal: ${goal.description}

${climateBlock}

Use your knowledge of this specific location and its regional climate conditions. \
Do not substitute another city's characteristics unless the site is actually there.

Use verified Open-Meteo temperature and US AQI exactly where provided. \
Use verified FEMA flood zone, flood risk, and SFHA status exactly where provided — do not re-estimate regulatory flood exposure when FEMA data is present. \
For urban heat island exposure, tree canopy, impervious surface, drought, and long-term adaptation recommendations, \
apply planning expertise but clearly label those as estimates distinct from verified weather/AQI/FEMA data.

When climateAvailable is true, copy climateData values exactly from the schema below — do not modify them.

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
  mergeClimateMetrics,
};
