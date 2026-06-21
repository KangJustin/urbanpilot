#!/usr/bin/env node
// Token compression bench, run with: node scripts/compression-bench.js [housing|climate|accessibility|all]
//
// For each scoring agent, builds the exact prompt its production analyzeX() sends today
// alongside a compressed counterpart that conveys the same information more tersely, then
// measures against the real Anthropic API:
//   1. Input token reduction (actual usage.input_tokens, not an estimate)
//   2. Whether the compressed-prompt output still parses as valid structured JSON
//   3. Whether the compressed-prompt output still cites the verified source numbers exactly
//      (the thing we most care about not losing — "improve/preserve downstream performance")
//   4. Whether risks/recommendations arrays kept their expected length
require('dotenv').config();
const Anthropic = require('@anthropic-ai/sdk');
const { compactRiskRecSchema, compactKeyValueLine } = require('../services/promptCompression');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = 'claude-haiku-4-5-20251001';
const MAX_TOKENS = 2048;

const SITE = { name: 'Downtown Berkeley, CA', center: { latitude: 37.8703, longitude: -122.2677 } };
const GOAL = { description: 'Improve walkability and housing affordability' };

// --- Housing ---

function housingAgent() {
  const { getHousingMetrics } = require('../services/censusService');
  const { formatCensusBlock, buildResponseSchema, buildVerifiedCensusPayload } = require('../agents/housing');
  const { parseHousingAgentJson } = require('../services/housingAgentParser');
  const SYSTEM = `You are an expert urban housing analyst for urban planning. \
You analyze existing housing density, transit-oriented development potential, mixed-use opportunities, \
affordability pressures, displacement risk, and housing-climate tradeoffs. \
When verified U.S. Census ACS metrics are provided, you MUST cite those exact numbers in summary and findings \
(e.g. "Median Gross Rent: $1,719 (ACS 2024 5-Year)"). Do NOT invent or override verified census statistics. \
Copy censusData numeric fields exactly from the prompt when censusAvailable is true. \
Return ONLY one valid JSON object matching the schema exactly. \
No markdown, no code fences, no commentary before or after the JSON.`;

  function compactCensusBlock(censusData) {
    return `ACS${censusData.geography?.geoid ? ` bg=${censusData.geography.geoid}` : ''}: ${compactKeyValueLine([
      ['pop', censusData.population],
      ['income', censusData.medianIncome != null ? `$${censusData.medianIncome}` : null],
      ['rent', censusData.medianRent != null ? `$${censusData.medianRent}` : null],
      ['home', censusData.medianHomeValue != null ? `$${censusData.medianHomeValue}` : null],
      ['poverty', censusData.povertyRate != null ? `${censusData.povertyRate}%` : null],
      ['renter', censusData.renterPercent != null ? `${censusData.renterPercent}%` : null],
      ['vacancy', censusData.vacancyRate != null ? `${censusData.vacancyRate}%` : null],
      ['units', censusData.housingUnits],
    ])} (${censusData.source})`;
  }

  return {
    system: SYSTEM,
    async fetchData() {
      try {
        const censusData = await getHousingMetrics(SITE.center.latitude, SITE.center.longitude);
        return { available: true, data: censusData };
      } catch (err) {
        console.warn('Census lookup failed, running without verified data:', err.message);
        return { available: false, data: null };
      }
    },
    buildOriginalPrompt({ available, data }) {
      const censusResult = { censusAvailable: available, censusData: data };
      const censusBlock = available
        ? formatCensusBlock(data)
        : 'No verified Census ACS data available for this location — note that housing statistics in findings are estimates.';
      const responseSchema = buildResponseSchema(censusResult);
      return `Analyze housing potential and constraints for this site and planning goal.

Site: ${SITE.name} (${SITE.center.latitude}, ${SITE.center.longitude})
Planning goal: ${GOAL.description}

${censusBlock}

Use verified ACS numbers exactly where provided. For zoning context, displacement risk, and recommendations, \
apply planning expertise but clearly distinguish estimates from verified census figures.

When censusAvailable is true, copy censusData numeric values exactly from the schema below — do not modify them.

Return exactly one JSON object matching this schema (replace placeholder strings and score with your analysis):
${responseSchema}`;
    },
    buildCompressedPrompt({ available, data }) {
      const censusBlock = available
        ? compactCensusBlock(data)
        : 'No verified census data — label housing stats as estimates.';
      const payload = available ? buildVerifiedCensusPayload(data) : null;
      const schema = `{"score":<0-100>,"summary":"<2-3 sentences, cite ACS metrics if available>",`
        + `${compactRiskRecSchema('h', 'housing')},`
        + `"censusAvailable":${available},"censusData":${available ? JSON.stringify(payload) : 'null'}}`;
      return `Analyze housing potential/constraints. Site: ${SITE.name} (${SITE.center.latitude}, ${SITE.center.longitude}). `
        + `Goal: ${GOAL.description}\n\nVerified data — ${censusBlock}\n\n`
        + `Cite verified numbers exactly; label non-verified planning analysis as estimates. `
        + `If censusAvailable, copy censusData values from the schema unchanged.\n\n`
        + `Return one JSON object, this exact shape, no other text:\n${schema}`;
    },
    parse(text) {
      return parseHousingAgentJson(text).parsed;
    },
    citesVerifiedNumbers(parsed, { data }) {
      if (!parsed) return false;
      const haystack = `${parsed.summary || ''} ${(parsed.findings || []).join(' ')}`;
      const needles = [data.medianIncome, data.medianRent, data.housingUnits]
        .filter(n => n != null)
        .map(n => n.toLocaleString('en-US'));
      return needles.every(n => haystack.includes(n));
    },
  };
}

// --- Climate ---

function climateAgent() {
  const { getOpenMeteoClimateMetrics } = require('../services/openMeteoService');
  const { getFemaFloodMetrics } = require('../services/femaNfhlService');
  const { getNlcdTreeCanopyMetrics } = require('../services/nlcdTccService');
  const {
    formatClimateBlock, buildResponseSchema, buildVerifiedClimatePayload, mergeClimateMetrics,
  } = require('../agents/climate');
  const { parseClimateAgentJson } = require('../services/climateAgentParser');
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

  function compactClimateBlock(climateData) {
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
      parts.push(`fema: ${compactKeyValueLine([
        ['zone', climateData.femaFloodZone],
        ['risk', climateData.femaFloodRisk],
        ['sfha', climateData.inSpecialFloodHazardArea ? 'yes' : 'no'],
        ['bfe', climateData.baseFloodElevationFt],
      ])}`);
    }
    if (climateData.treeCanopyPercent != null) {
      parts.push(`nlcd: ${compactKeyValueLine([
        ['canopy', `${climateData.treeCanopyPercent}%`],
        ['year', climateData.treeCanopyYear],
        ['res', `${climateData.treeCanopyResolutionM}m`],
      ])}`);
    }
    return parts.join('; ');
  }

  return {
    system: SYSTEM,
    async fetchData() {
      const { latitude, longitude } = SITE.center;
      const [openMeteoResult, femaResult, nlcdResult] = await Promise.all([
        getOpenMeteoClimateMetrics(latitude, longitude).catch((err) => {
          console.warn('Open-Meteo lookup failed:', err.message);
          return { climateAvailable: false, climateData: null };
        }),
        getFemaFloodMetrics(latitude, longitude).catch((err) => {
          console.warn('FEMA NFHL lookup failed:', err.message);
          return { femaAvailable: false, femaData: null };
        }),
        getNlcdTreeCanopyMetrics(latitude, longitude).catch((err) => {
          console.warn('NLCD TCC lookup failed:', err.message);
          return { nlcdAvailable: false, nlcdData: null };
        }),
      ]);
      const merged = mergeClimateMetrics(openMeteoResult, femaResult, nlcdResult);
      return { available: merged.climateAvailable, data: merged.climateData };
    },
    buildOriginalPrompt({ available, data }) {
      const climateResult = { climateAvailable: available, climateData: data };
      const climateBlock = available
        ? formatClimateBlock(data)
        : 'No verified Open-Meteo, FEMA, or NLCD data available for this location — note that conditions and climate findings are estimates.';
      const responseSchema = buildResponseSchema(climateResult);
      return `Analyze climate resilience for this site and planning goal.

Site: ${SITE.name} (${SITE.center.latitude}, ${SITE.center.longitude})
Planning goal: ${GOAL.description}

${climateBlock}

Use your knowledge of this specific location and its regional climate conditions. \
Do not substitute another city's characteristics unless the site is actually there.

Use verified Open-Meteo temperature and US AQI exactly where provided. \
Use verified FEMA flood zone, flood risk, and SFHA status exactly where provided — do not re-estimate regulatory flood exposure when FEMA data is present. \
Use verified NLCD treeCanopyPercent exactly where provided — cite the 30m pixel value and note it may differ from neighborhood averages; do not substitute a different canopy estimate. \
For urban heat island exposure, impervious surface, drought, and long-term greening/adaptation recommendations, \
apply planning expertise but clearly label those as estimates distinct from verified weather/AQI/FEMA/NLCD data.

When climateAvailable is true, copy climateData values exactly from the schema below — do not modify them.

Return exactly one JSON object matching this schema (replace placeholder strings and score with your analysis):
${responseSchema}`;
    },
    buildCompressedPrompt({ available, data }) {
      const climateBlock = available
        ? compactClimateBlock(data)
        : 'No verified weather/FEMA/NLCD data — label climate stats as estimates.';
      const payload = available ? buildVerifiedClimatePayload(data) : null;
      const schema = `{"score":<0-100>,"summary":"<2-3 sentences, cite verified metrics if available>",`
        + `${compactRiskRecSchema('c', 'climate')},`
        + `"climateAvailable":${available},"climateData":${available ? JSON.stringify(payload) : 'null'}}`;
      return `Analyze climate resilience. Site: ${SITE.name} (${SITE.center.latitude}, ${SITE.center.longitude}). `
        + `Goal: ${GOAL.description}\n\nVerified data — ${climateBlock}\n\n`
        + `Cite verified numbers exactly; label heat/impervious/drought/greening analysis as estimates. `
        + `If climateAvailable, copy climateData values from the schema unchanged.\n\n`
        + `Return one JSON object, this exact shape, no other text:\n${schema}`;
    },
    parse(text) {
      return parseClimateAgentJson(text).parsed;
    },
    citesVerifiedNumbers(parsed, { data }) {
      if (!parsed) return false;
      const haystack = `${parsed.summary || ''} ${(parsed.findings || []).join(' ')}`;
      const needles = [];
      if (data.usAqi != null) needles.push(String(data.usAqi));
      if (data.femaFloodZone != null) needles.push(data.femaFloodZone);
      if (data.treeCanopyPercent != null) needles.push(String(data.treeCanopyPercent));
      return needles.every(n => haystack.includes(n));
    },
  };
}

// --- Accessibility ---

function accessibilityAgent() {
  const { getTransitMetrics } = require('../services/transit511Service');
  const { formatTransitBlock, buildResponseSchema, buildVerifiedTransitPayload } = require('../agents/accessibility');
  const { parseAccessibilityAgentJson } = require('../services/accessibilityAgentParser');
  const SYSTEM = `You are an expert urban accessibility analyst for urban planning. \
You analyze walkability, ADA and mobility barriers, transit access, bicycle connectivity, \
pedestrian safety, and proximity to essential services. \
When verified 511 SF Bay Regional GTFS transit metrics are provided, you MUST cite those exact numbers \
in summary and findings (e.g. "28 transit stops within 800m (511 SF Bay Regional GTFS)"). \
Do NOT invent or override verified transit statistics. \
Copy transitData numeric fields exactly from the prompt when transitAvailable is true. \
Return ONLY one valid JSON object matching the schema exactly. \
No markdown, no code fences, no commentary before or after the JSON.`;

  function compactTransitBlock(transitData) {
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

  return {
    system: SYSTEM,
    async fetchData() {
      try {
        const result = await getTransitMetrics(SITE.center.latitude, SITE.center.longitude);
        return { available: result.transitAvailable, data: result.transitData };
      } catch (err) {
        console.warn('511 GTFS lookup failed, running without verified data:', err.message);
        return { available: false, data: null };
      }
    },
    buildOriginalPrompt({ available, data }) {
      const transitResult = { transitAvailable: available, transitData: data };
      const transitBlock = available
        ? formatTransitBlock(data)
        : 'No verified 511 SF Bay transit data available for this location — note that transit access statistics in findings are estimates.';
      const responseSchema = buildResponseSchema(transitResult);
      return `Analyze accessibility and mobility for this site and planning goal.

Site: ${SITE.name} (${SITE.center.latitude}, ${SITE.center.longitude})
Planning goal: ${GOAL.description}

${transitBlock}

Use your knowledge of this specific location, its transit infrastructure, and street network. \
Do not substitute another city's characteristics unless the site is actually there. \
Use verified 511 GTFS numbers exactly where provided. For walkability, bike connectivity, pedestrian safety, \
and ADA barriers, apply planning expertise but clearly distinguish estimates from verified transit figures.

When transitAvailable is true, copy transitData numeric values exactly from the schema below — do not modify them.

Return exactly one JSON object matching this schema (replace placeholder strings and score with your analysis):
${responseSchema}`;
    },
    buildCompressedPrompt({ available, data }) {
      const transitBlock = available
        ? compactTransitBlock(data)
        : 'No verified transit data — label accessibility stats as estimates.';
      const payload = available ? buildVerifiedTransitPayload(data) : null;
      const schema = `{"score":<0-100>,"summary":"<2-3 sentences, cite verified transit metrics if available>",`
        + `${compactRiskRecSchema('a', 'accessibility')},`
        + `"transitAvailable":${available},"transitData":${available ? JSON.stringify(payload) : 'null'}}`;
      return `Analyze accessibility/mobility. Site: ${SITE.name} (${SITE.center.latitude}, ${SITE.center.longitude}). `
        + `Goal: ${GOAL.description}\n\nVerified data — ${transitBlock}\n\n`
        + `Cite verified numbers exactly; label walkability/bike/ADA analysis as estimates. `
        + `If transitAvailable, copy transitData values from the schema unchanged.\n\n`
        + `Return one JSON object, this exact shape, no other text:\n${schema}`;
    },
    parse(text) {
      return parseAccessibilityAgentJson(text).parsed;
    },
    citesVerifiedNumbers(parsed, { data }) {
      if (!parsed) return false;
      const haystack = `${parsed.summary || ''} ${(parsed.findings || []).join(' ')}`;
      const needles = [data.nearbyStops400m, data.nearbyStops800m, data.uniqueRoutes800m]
        .filter(n => n != null)
        .map(n => String(n));
      return needles.every(n => haystack.includes(n));
    },
  };
}

const AGENTS = { housing: housingAgent, climate: climateAgent, accessibility: accessibilityAgent };

async function run(label, agent, prompt) {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: [{ type: 'text', text: agent.system }], // no cache_control — measuring true per-request cost
    messages: [{ role: 'user', content: prompt }],
  });
  const text = response.content[0].text;
  const parsed = agent.parse(text);
  return {
    label,
    promptChars: prompt.length,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    stopReason: response.stop_reason,
    parsed,
  };
}

async function benchAgent(name) {
  console.log(`\n=== Token Compression Bench: ${name} agent ===`);
  const agent = AGENTS[name]();
  const dataResult = await agent.fetchData();

  const originalPrompt = agent.buildOriginalPrompt(dataResult);
  const compressedPrompt = agent.buildCompressedPrompt(dataResult);

  const original = await run('original', agent, originalPrompt);
  const compressed = await run('compressed', agent, compressedPrompt);

  const tokenReduction = 1 - compressed.inputTokens / original.inputTokens;
  const charReduction = 1 - compressed.promptChars / original.promptChars;

  console.log(`Prompt chars:   original=${original.promptChars}  compressed=${compressed.promptChars}  (${(charReduction * 100).toFixed(1)}% smaller)`);
  console.log(`Input tokens:   original=${original.inputTokens}  compressed=${compressed.inputTokens}  (${(tokenReduction * 100).toFixed(1)}% reduction)`);
  console.log(`Output tokens:  original=${original.outputTokens}  compressed=${compressed.outputTokens}`);
  console.log(`Valid JSON:     original=${!!original.parsed}  compressed=${!!compressed.parsed}`);
  if (dataResult.available) {
    console.log(`Cites verified numbers: original=${agent.citesVerifiedNumbers(original.parsed, dataResult)}  compressed=${agent.citesVerifiedNumbers(compressed.parsed, dataResult)}`);
  }
  console.log(`Risks intact (len 2):           original=${original.parsed?.risks?.length}  compressed=${compressed.parsed?.risks?.length}`);
  console.log(`Recommendations intact (len 2): original=${original.parsed?.recommendations?.length}  compressed=${compressed.parsed?.recommendations?.length}`);

  return { name, tokenReduction, charReduction, original, compressed };
}

(async () => {
  const arg = process.argv[2] || 'all';
  const names = arg === 'all' ? Object.keys(AGENTS) : [arg];
  const invalid = names.filter(n => !AGENTS[n]);
  if (invalid.length) {
    console.error(`Unknown agent(s): ${invalid.join(', ')}. Valid: ${Object.keys(AGENTS).join(', ')}, all`);
    process.exit(1);
  }

  const results = [];
  for (const name of names) {
    results.push(await benchAgent(name));
  }

  if (results.length > 1) {
    console.log('\n=== Summary ===');
    for (const r of results) {
      console.log(`${r.name}: ${(r.tokenReduction * 100).toFixed(1)}% input token reduction (${r.original.inputTokens} -> ${r.compressed.inputTokens})`);
    }
  }
})();
