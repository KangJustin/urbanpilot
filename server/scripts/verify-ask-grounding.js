#!/usr/bin/env node
// Verify Ask AI grounding: node scripts/verify-ask-grounding.js
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { runAnalysis } = require('../agents/coordinator');
const { buildContext, answerQuestion } = require('../agents/ask');

const BERKELEY_SITE = {
  name: 'Downtown Berkeley, CA',
  formattedAddress: 'Downtown Berkeley, CA',
  center: { latitude: 37.8703, longitude: -122.2677 },
};

const GOAL = {
  primary: 'mixed_use_development',
  description: 'Add housing near transit while reducing heat and improving biking',
  priorities: [],
};

const SAMPLE_QUESTION = 'What verified data supports this plan?';

function assertContains(text, needle, label) {
  const hay = String(text);
  const n = String(needle);
  if (!hay.includes(n)) {
    console.error(`FAIL: missing ${label}: ${needle}`);
    process.exit(1);
  }
  console.log(`OK: contains ${label}`);
}

function assertMatchesAny(text, patterns, label) {
  const hay = String(text).toLowerCase();
  if (!patterns.some((p) => hay.includes(p.toLowerCase()))) {
    console.error(`FAIL: response missing ${label} (tried: ${patterns.join(', ')})`);
    process.exit(1);
  }
  console.log(`OK: response cites ${label}`);
}

(async () => {
  console.log('\n========== Building grounded analysis payload (Berkeley) ==========\n');
  console.log('(This runs the full coordinator pipeline — may take 1–2 minutes.)\n');

  const data = await runAnalysis({
    site: BERKELEY_SITE,
    goal: GOAL,
    scenarioYears: ['2026', '2040', '2075'],
    analysisId: 'verify-ask-grounding',
  });

  const context = buildContext(BERKELEY_SITE, data);

  console.log('\n========== Ask context (verified section excerpt) ==========\n');
  const start = context.indexOf('Verified baselines:');
  const end = context.indexOf('Data disclosure:');
  console.log(context.slice(start, end > start ? end : start + 1200));

  console.log('\n========== Context content checks ==========\n');

  const census = data.agents?.housing?.censusData;
  const transit = data.agents?.accessibility?.transitData;
  const climate = data.agents?.climate?.climateData;

  if (census?.medianRent != null) {
    assertContains(context, `$${census.medianRent.toLocaleString('en-US')}`, 'ACS median rent');
  }
  if (transit?.nearbyStops800m != null) {
    assertContains(context, String(transit.nearbyStops800m), 'GTFS stops within 800m');
  }
  if (climate?.femaFloodZone != null) {
    assertContains(context, climate.femaFloodZone, 'FEMA flood zone');
  }
  if (climate?.treeCanopyPercent != null) {
    assertContains(context, `${climate.treeCanopyPercent}%`, 'NLCD tree canopy');
  }
  if (climate?.usAqi != null) {
    assertContains(context, String(climate.usAqi), 'Open-Meteo AQI');
  }

  assertContains(context, 'Real data used:', 'dataDisclosure.realDataUsed section');
  assertContains(context, 'Estimated / AI-generated data:', 'dataDisclosure.estimatedData section');

  console.log('\n========== Sample Ask AI question ==========\n');
  console.log(SAMPLE_QUESTION);

  const { answer } = await answerQuestion({
    question: SAMPLE_QUESTION,
    site: BERKELEY_SITE,
    data,
  });

  console.log('\n========== Ask AI response ==========\n');
  console.log(answer);

  console.log('\n========== Response citation checks ==========\n');
  assertMatchesAny(answer, ['ACS', 'Census', 'median rent', '$1,719'], 'ACS housing source');
  assertMatchesAny(answer, ['511', 'GTFS', 'transit', '800m', '66'], 'GTFS transit source');
  assertMatchesAny(answer, ['FEMA', 'flood zone', 'zone X'], 'FEMA flood source');
  assertMatchesAny(answer, ['NLCD', 'canopy', '0%'], 'NLCD canopy source');
  assertMatchesAny(answer, ['Open-Meteo', 'AQI', '30'], 'Open-Meteo AQI source');

  console.log('\nVerification complete.');
})();
