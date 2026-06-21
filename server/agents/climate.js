const { callAgentRaw } = require('../services/claudeService');
const { getOpenMeteoClimateMetrics, SOURCE: OPEN_METEO_SOURCES } = require('../services/openMeteoService');
const { getFemaFloodMetrics, SOURCE: FEMA_SOURCE } = require('../services/femaNfhlService');
const { getNlcdTreeCanopyMetrics, SOURCE: NLCD_SOURCE } = require('../services/nlcdTccService');
const { parseClimateAgentJson, buildClimateFallback } = require('../services/climateAgentParser');
const { compactRiskRecSchema, compactKeyValueLine } = require('../services/promptCompression');

const CLIMATE_MODEL = 'claude-haiku-4-5-20251001';
const CLIMATE_MAX_TOKENS = 2048;

const SYSTEM = `You are an expert climate resilience analyst for urban planning. \
You analyze urban heat island exposure, flooding and stormwater risk, tree canopy coverage, \
impervious surface area, and green infrastructure potential. \
When verified Open-Meteo current weather and US AQI metrics are provided, you MUST cite those exact values \
in summary and findings (e.g. "Current temperature: 62°F, US AQI 42 (Good)"). \
When verified FEMA NFHL flood zone data is provided, you MUST cite the exact flood zone, flood risk level, \
and SFHA status (e.g. "FEMA flood zone X, Minimal risk, not in Special Flood Hazard Area"). \
When verified NLCD tree canopy data is provided, you MUST cite the exact treeCanopyPercent \
(e.g. "NLCD tree canopy: 0% (2023, 30m pixel)") and note that a 30m pixel-level value may differ from a neighborhood average. \
Do NOT invent or override verified Open-Meteo, FEMA, or NLCD statistics. \
Copy climateData numeric and string fields exactly from the prompt when climateAvailable is true. \
Heat island severity, impervious surface %, drought, and long-term greening/climate projections \
are AI estimates unless explicitly marked as verified — distinguish them clearly from verified weather/AQI/FEMA/NLCD data. \
Return ONLY one valid JSON object matching the schema exactly. \
No markdown, no code fences, no commentary before or after the JSON.`;

function formatClimateBlock(climateData) {
  if (!climateData) return '';

  const parts = [];
  if (climateData.temperatureF != null || climateData.usAqi != null) {
    parts.push(`weather: ${compactKeyValueLine([
      ['temp', climateData.temperatureF != null ? `${Math.round(climateData.temperatureF)}F` : null],
      ['code', climateData.weatherCode],
      ['desc', climateData.weatherDescription],
      ['aqi', climateData.usAqi],
      ['cat', climateData.aqiCategory],
      ['at', climateData.observedAt],
    ])}`);
  }

  if (climateData.femaFloodZone != null) {
    parts.push(`fema(${FEMA_SOURCE}): ${compactKeyValueLine([
      ['zone', climateData.femaFloodZone],
      ['risk', climateData.femaFloodRisk],
      ['sfha', climateData.inSpecialFloodHazardArea ? 'yes' : 'no'],
      ['bfe', climateData.baseFloodElevationFt],
    ])}`);
  }

  if (climateData.treeCanopyPercent != null) {
    parts.push(`nlcd(${NLCD_SOURCE}): ${compactKeyValueLine([
      ['canopy', `${climateData.treeCanopyPercent}%`],
      ['year', climateData.treeCanopyYear],
      ['res', `${climateData.treeCanopyResolutionM}m`],
    ])} (30m pixel, may differ from neighborhood avg)`);
  }

  return parts.join('; ');
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

  if (climateData.treeCanopyPercent != null) {
    payload.treeCanopyPercent = climateData.treeCanopyPercent;
    payload.treeCanopyYear = climateData.treeCanopyYear;
    payload.treeCanopyResolutionM = climateData.treeCanopyResolutionM;
  }

  return payload;
}

function buildClimateDataSchema(climateResult) {
  if (!climateResult.climateAvailable) return 'null';
  return JSON.stringify(buildVerifiedClimatePayload(climateResult.climateData));
}

function buildResponseSchema(climateResult) {
  const climateDataSchema = buildClimateDataSchema(climateResult);
  return `{"score":<0-100>,"summary":"<2-3 sentences, cite verified metrics if available>",`
    + `${compactRiskRecSchema('c', 'climate')},`
    + `"climateAvailable":${climateResult.climateAvailable},"climateData":${climateDataSchema}}`;
}

function mergeClimateMetrics(openMeteoResult, femaResult, nlcdResult) {
  const hasOpenMeteo = openMeteoResult?.climateAvailable && openMeteoResult.climateData;
  const hasFema = femaResult?.femaAvailable && femaResult.femaData;
  const hasNlcd = nlcdResult?.nlcdAvailable && nlcdResult.nlcdData;

  if (!hasOpenMeteo && !hasFema && !hasNlcd) {
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

  if (hasNlcd) {
    const n = nlcdResult.nlcdData;
    climateData.treeCanopyPercent = n.treeCanopyPercent;
    climateData.treeCanopyYear = n.year;
    climateData.treeCanopyResolutionM = n.resolutionM;
    if (!source.includes(NLCD_SOURCE)) source.push(NLCD_SOURCE);
  }

  climateData.source = source;

  return {
    climateAvailable: true,
    climateData,
    femaAvailable: !!hasFema,
    nlcdAvailable: !!hasNlcd,
  };
}

async function fetchClimateMetrics(site) {
  const { latitude, longitude } = site.center || {};
  if (latitude == null || longitude == null) {
    return { climateAvailable: false };
  }

  const [openMeteoResult, femaResult, nlcdResult] = await Promise.all([
    getOpenMeteoClimateMetrics(latitude, longitude).catch((err) => {
      console.warn('[climate] Open-Meteo lookup failed, continuing without weather/AQI:', err.message);
      return { climateAvailable: false, climateData: null };
    }),
    getFemaFloodMetrics(latitude, longitude).catch((err) => {
      console.warn('[climate] FEMA NFHL lookup failed, continuing without flood zone:', err.message);
      return { femaAvailable: false, femaData: null };
    }),
    getNlcdTreeCanopyMetrics(latitude, longitude).catch((err) => {
      console.warn('[climate] NLCD TCC lookup failed, continuing without tree canopy:', err.message);
      return { nlcdAvailable: false, nlcdData: null };
    }),
  ]);

  return mergeClimateMetrics(openMeteoResult, femaResult, nlcdResult);
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
    : 'No verified Open-Meteo, FEMA, or NLCD data available for this location — note that conditions and climate findings are estimates.';

  const responseSchema = buildResponseSchema(climateResult);

  const prompt = `Analyze climate resilience. Site: ${site.name} (${site.center.latitude}, ${site.center.longitude}). `
    + `Goal: ${goal.description}\n\nVerified data — ${climateBlock}\n\n`
    + `Cite verified numbers exactly; label heat/impervious/drought/greening analysis as estimates. `
    + `If climateAvailable, copy climateData values from the schema unchanged.\n\n`
    + `Return one JSON object, this exact shape, no other text:\n${responseSchema}`;

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
