const { callAgentRaw } = require('../services/claudeService');
const { getHousingMetrics } = require('../services/censusService');
const { parseHousingAgentJson, buildHousingFallback } = require('../services/housingAgentParser');

const HOUSING_MODEL = 'claude-haiku-4-5-20251001';
const HOUSING_MAX_TOKENS = 2048;

const SYSTEM = `You are an expert urban housing analyst for urban planning. \
You analyze existing housing density, transit-oriented development potential, mixed-use opportunities, \
affordability pressures, displacement risk, and housing-climate tradeoffs. \
When verified U.S. Census ACS metrics are provided, you MUST cite those exact numbers in summary and findings \
(e.g. "Median Gross Rent: $1,719 (ACS 2024 5-Year)"). Do NOT invent or override verified census statistics. \
Copy censusData numeric fields exactly from the prompt when censusAvailable is true. \
Return ONLY one valid JSON object matching the schema exactly. \
No markdown, no code fences, no commentary before or after the JSON.`;

function formatCensusBlock(censusData) {
  if (!censusData) return '';
  const fmt = (n, prefix = '') => (n == null ? 'N/A' : `${prefix}${n.toLocaleString('en-US')}`);
  return `
Verified U.S. Census Bureau ACS data (${censusData.source}) for block group ${censusData.geography?.geoid || 'unknown'}:
- Population: ${fmt(censusData.population)}
- Median Household Income: ${fmt(censusData.medianIncome, '$')}
- Median Gross Rent: ${fmt(censusData.medianRent, '$')}
- Median Home Value: ${fmt(censusData.medianHomeValue, '$')}
- Poverty Rate: ${censusData.povertyRate == null ? 'N/A' : `${censusData.povertyRate}%`}
- Percent Renter Occupied: ${censusData.renterPercent == null ? 'N/A' : `${censusData.renterPercent}%`}
- Vacancy Rate: ${censusData.vacancyRate == null ? 'N/A' : `${censusData.vacancyRate}%`}
- Housing Units: ${fmt(censusData.housingUnits)}
`.trim();
}

function buildVerifiedCensusPayload(censusData) {
  const { geography, datasetYear, acsVariables, geographyName, ...metrics } = censusData;
  return {
    population: metrics.population,
    medianIncome: metrics.medianIncome,
    medianRent: metrics.medianRent,
    medianHomeValue: metrics.medianHomeValue,
    povertyRate: metrics.povertyRate,
    renterPercent: metrics.renterPercent,
    vacancyRate: metrics.vacancyRate,
    housingUnits: metrics.housingUnits,
    source: metrics.source,
    verified: true,
    geography: {
      geoid: geography.geoid,
      state: geography.state,
      county: geography.county,
      tract: geography.tract,
      blockGroup: geography.blockGroup,
      name: geographyName || geography.name,
    },
    datasetYear,
    acsVariables,
  };
}

function buildCensusDataSchema(censusResult) {
  if (!censusResult.censusAvailable) {
    return 'null';
  }
  const payload = buildVerifiedCensusPayload(censusResult.censusData);
  return JSON.stringify(payload, null, 2);
}

function buildResponseSchema(censusResult) {
  const censusDataSchema = buildCensusDataSchema(censusResult);
  return `{
  "score": 0,
  "summary": "string — 2-3 sentences citing verified ACS metrics when available",
  "findings": [
    "string — include ACS-sourced metrics where relevant",
    "string",
    "string",
    "string"
  ],
  "risks": [
    {
      "id": "hr1",
      "title": "string",
      "description": "string",
      "severity": 3,
      "category": "housing"
    },
    {
      "id": "hr2",
      "title": "string",
      "description": "string",
      "severity": 2,
      "category": "housing"
    }
  ],
  "recommendations": [
    {
      "id": "hrec1",
      "title": "string",
      "description": "string",
      "cost": "high",
      "timeline": "long_term",
      "priority": 1,
      "impact": { "climate": 0, "accessibility": 0, "housing": 0, "equity": 0 }
    },
    {
      "id": "hrec2",
      "title": "string",
      "description": "string",
      "cost": "low",
      "timeline": "medium_term",
      "priority": 2,
      "impact": { "climate": 0, "accessibility": 0, "housing": 0, "equity": 0 }
    }
  ],
  "censusAvailable": ${censusResult.censusAvailable},
  "censusData": ${censusResult.censusAvailable ? censusDataSchema : 'null'}
}`;
}

async function fetchCensusData(site) {
  const { latitude, longitude } = site.center || {};
  if (latitude == null || longitude == null) {
    return { censusAvailable: false };
  }

  try {
    const censusData = await getHousingMetrics(latitude, longitude);
    return { censusAvailable: true, censusData };
  } catch (err) {
    console.warn('[housing] ACS lookup failed, continuing without census data:', err.message);
    return { censusAvailable: false };
  }
}

function attachVerifiedCensus(agentResult, censusResult) {
  if (!censusResult.censusAvailable) {
    return {
      ...agentResult,
      censusAvailable: false,
      censusData: null,
    };
  }

  return {
    ...agentResult,
    censusAvailable: true,
    censusData: buildVerifiedCensusPayload(censusResult.censusData),
  };
}

async function callHousingClaude(prompt) {
  const { text, stopReason } = await callAgentRaw(SYSTEM, prompt, HOUSING_MODEL, HOUSING_MAX_TOKENS);
  console.log('[housing] Claude stop_reason:', stopReason);
  console.log('[housing] Raw Claude response:\n', text);
  return text;
}

async function analyzeHousing({ site, goal }) {
  const censusResult = await fetchCensusData(site);
  const censusBlock = censusResult.censusAvailable
    ? formatCensusBlock(censusResult.censusData)
    : 'No verified Census ACS data available for this location — note that housing statistics in findings are estimates.';

  const responseSchema = buildResponseSchema(censusResult);

  const prompt = `Analyze housing potential and constraints for this site and planning goal.

Site: ${site.name} (${site.center.latitude}, ${site.center.longitude})
Planning goal: ${goal.description}

${censusBlock}

Use verified ACS numbers exactly where provided. For zoning context, displacement risk, and recommendations, \
apply planning expertise but clearly distinguish estimates from verified census figures.

When censusAvailable is true, copy censusData numeric values exactly from the schema below — do not modify them.

Return exactly one JSON object matching this schema (replace placeholder strings and score with your analysis):
${responseSchema}`;

  let rawText;
  try {
    rawText = await callHousingClaude(prompt);
  } catch (err) {
    console.error('[housing] Claude API call failed:', err.message);
    return attachVerifiedCensus(
      buildHousingFallback({ site, goal, censusResult, rawText: null, parseError: err.message }),
      censusResult,
    );
  }

  const { parsed, strategy, attempts } = parseHousingAgentJson(rawText);
  console.log('[housing] JSON parse strategy:', strategy || 'failed');
  if (!parsed) {
    const lastError = attempts.find(a => !a.ok)?.error || 'Unknown parse error';
    console.error('[housing] JSON parse failed:', lastError);
    return attachVerifiedCensus(
      buildHousingFallback({ site, goal, censusResult, rawText, parseError: lastError }),
      censusResult,
    );
  }

  console.log('[housing] Parsed JSON:', JSON.stringify(parsed, null, 2));

  const { censusData: _ignoredCensus, censusAvailable: _ignoredFlag, ...interpretation } = parsed;
  return attachVerifiedCensus(interpretation, censusResult);
}

module.exports = {
  analyzeHousing,
  buildResponseSchema,
  formatCensusBlock,
  buildVerifiedCensusPayload,
};
