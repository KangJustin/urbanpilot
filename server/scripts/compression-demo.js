#!/usr/bin/env node
// Token compression demo, run with: node scripts/compression-demo.js
//
// Real-world test bed: the Housing Agent's actual production prompt (verified ACS census
// data + a long pretty-printed JSON response schema sent on every request, uncached). We build
// the exact prompt analyzeHousing() sends today, then a compressed version that conveys the same
// information more tersely, and measure:
//   1. Input token reduction (the real Anthropic API usage.input_tokens, not an estimate)
//   2. Whether the compressed-prompt output still parses as valid structured JSON
//   3. Whether the compressed-prompt output still cites the verified census numbers exactly
//      (the thing we most care about not losing — "improve/preserve downstream performance")
require('dotenv').config();
const Anthropic = require('@anthropic-ai/sdk');
const { getHousingMetrics } = require('../services/censusService');
const { formatCensusBlock, buildResponseSchema, buildVerifiedCensusPayload } = require('../agents/housing');
const { parseHousingAgentJson } = require('../services/housingAgentParser');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = 'claude-haiku-4-5-20251001';
const MAX_TOKENS = 2048;

const SYSTEM = `You are an expert urban housing analyst for urban planning. \
You analyze existing housing density, transit-oriented development potential, mixed-use opportunities, \
affordability pressures, displacement risk, and housing-climate tradeoffs. \
When verified U.S. Census ACS metrics are provided, you MUST cite those exact numbers in summary and findings \
(e.g. "Median Gross Rent: $1,719 (ACS 2024 5-Year)"). Do NOT invent or override verified census statistics. \
Copy censusData numeric fields exactly from the prompt when censusAvailable is true. \
Return ONLY one valid JSON object matching the schema exactly. \
No markdown, no code fences, no commentary before or after the JSON.`;

const SITE = { name: 'Downtown Berkeley, CA', center: { latitude: 37.8703, longitude: -122.2677 } };
const GOAL = { description: 'Improve walkability and housing affordability' };

// --- Compressed prompt construction (mirrors housing.js's real logic, just terser encoding) ---

function compactCensusBlock(censusData) {
  const fmt = (n, prefix = '', suffix = '') => (n == null ? 'N/A' : `${prefix}${n}${suffix}`);
  return `ACS${censusData.geography?.geoid ? ` bg=${censusData.geography.geoid}` : ''}: `
    + `pop=${fmt(censusData.population)} income=${fmt(censusData.medianIncome, '$')} `
    + `rent=${fmt(censusData.medianRent, '$')} home=${fmt(censusData.medianHomeValue, '$')} `
    + `poverty=${fmt(censusData.povertyRate, '', '%')} renter=${fmt(censusData.renterPercent, '', '%')} `
    + `vacancy=${fmt(censusData.vacancyRate, '', '%')} units=${fmt(censusData.housingUnits)} `
    + `(${censusData.source})`;
}

function compactResponseSchema(censusAvailable, compactCensusPayload) {
  const censusPart = censusAvailable ? JSON.stringify(compactCensusPayload) : 'null';
  return `{"score":<0-100>,"summary":"<2-3 sentences, cite ACS metrics if available>",`
    + `"findings":["<finding>","<finding>","<finding>","<finding>"],`
    + `"risks":[{"id":"hr1","title":"<t>","description":"<d>","severity":<1-5>,"category":"housing"},`
    + `{"id":"hr2","title":"<t>","description":"<d>","severity":<1-5>,"category":"housing"}],`
    + `"recommendations":[{"id":"hrec1","title":"<t>","description":"<d>","cost":"low|medium|high",`
    + `"timeline":"short_term|medium_term|long_term","priority":<int>,"impact":{"climate":<int>,"accessibility":<int>,"housing":<int>,"equity":<int>}},`
    + `{"id":"hrec2","title":"<t>","description":"<d>","cost":"low|medium|high",`
    + `"timeline":"short_term|medium_term|long_term","priority":<int>,"impact":{"climate":<int>,"accessibility":<int>,"housing":<int>,"equity":<int>}}],`
    + `"censusAvailable":${censusAvailable},"censusData":${censusPart}}`;
}

function buildOriginalPrompt(censusResult) {
  const censusBlock = censusResult.censusAvailable
    ? formatCensusBlock(censusResult.censusData)
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
}

function buildCompressedPrompt(censusResult) {
  const censusBlock = censusResult.censusAvailable
    ? compactCensusBlock(censusResult.censusData)
    : 'No verified census data — label housing stats as estimates.';
  const compactPayload = censusResult.censusAvailable ? buildVerifiedCensusPayload(censusResult.censusData) : null;
  const responseSchema = compactResponseSchema(censusResult.censusAvailable, compactPayload);
  return `Analyze housing potential/constraints. Site: ${SITE.name} (${SITE.center.latitude}, ${SITE.center.longitude}). `
    + `Goal: ${GOAL.description}\n\nVerified data — ${censusBlock}\n\n`
    + `Cite verified numbers exactly; label non-verified planning analysis as estimates. `
    + `If censusAvailable, copy censusData values from the schema unchanged.\n\n`
    + `Return one JSON object, this exact shape, no other text:\n${responseSchema}`;
}

async function run(label, prompt) {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: [{ type: 'text', text: SYSTEM }], // no cache_control here — measuring true per-request cost
    messages: [{ role: 'user', content: prompt }],
  });
  const text = response.content[0].text;
  const { parsed } = parseHousingAgentJson(text);
  return {
    label,
    promptChars: prompt.length,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    stopReason: response.stop_reason,
    parsed,
    text,
  };
}

function citesVerifiedNumbers(parsed, censusData) {
  if (!parsed) return false;
  const haystack = `${parsed.summary || ''} ${(parsed.findings || []).join(' ')}`;
  const needles = [censusData.medianIncome, censusData.medianRent, censusData.housingUnits]
    .filter(n => n != null)
    .map(n => n.toLocaleString('en-US'));
  return needles.every(n => haystack.includes(n));
}

(async () => {
  console.log('=== Token Compression Demo: Housing Agent prompt ===\n');
  console.log(`Site: ${SITE.name}\n`);

  const censusResult = await (async () => {
    try {
      const censusData = await getHousingMetrics(SITE.center.latitude, SITE.center.longitude);
      return { censusAvailable: true, censusData };
    } catch (err) {
      console.warn('Census lookup failed, running without verified data:', err.message);
      return { censusAvailable: false };
    }
  })();

  const originalPrompt = buildOriginalPrompt(censusResult);
  const compressedPrompt = buildCompressedPrompt(censusResult);

  console.log('--- Running ORIGINAL prompt (production housing.js logic) ---');
  const original = await run('original', originalPrompt);
  console.log('--- Running COMPRESSED prompt ---');
  const compressed = await run('compressed', compressedPrompt);

  const tokenReduction = 1 - compressed.inputTokens / original.inputTokens;
  const charReduction = 1 - compressed.promptChars / original.promptChars;

  console.log('\n=== Results ===');
  console.log(`Prompt chars:   original=${original.promptChars}  compressed=${compressed.promptChars}  (${(charReduction * 100).toFixed(1)}% smaller)`);
  console.log(`Input tokens:   original=${original.inputTokens}  compressed=${compressed.inputTokens}  (${(tokenReduction * 100).toFixed(1)}% reduction)`);
  console.log(`Output tokens:  original=${original.outputTokens}  compressed=${compressed.outputTokens}`);
  console.log(`Stop reason:    original=${original.stopReason}  compressed=${compressed.stopReason}`);
  console.log(`Valid JSON:     original=${!!original.parsed}  compressed=${!!compressed.parsed}`);

  if (censusResult.censusAvailable) {
    console.log(`Cites verified numbers exactly: original=${citesVerifiedNumbers(original.parsed, censusResult.censusData)}  compressed=${citesVerifiedNumbers(compressed.parsed, censusResult.censusData)}`);
  }
  console.log(`Recommendations intact (length 2): original=${original.parsed?.recommendations?.length}  compressed=${compressed.parsed?.recommendations?.length}`);
  console.log(`Risks intact (length 2):           original=${original.parsed?.risks?.length}  compressed=${compressed.parsed?.risks?.length}`);

  console.log('\n--- Original summary ---');
  console.log(original.parsed?.summary || '(parse failed)');
  console.log('\n--- Compressed summary ---');
  console.log(compressed.parsed?.summary || '(parse failed)');
})();
