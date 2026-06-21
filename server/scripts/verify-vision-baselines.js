#!/usr/bin/env node
// Verify Vision Agent baseline grounding: node scripts/verify-vision-baselines.js
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { analyzeClimate } = require('../agents/climate');
const { analyzeAccessibility } = require('../agents/accessibility');
const { analyzeHousing } = require('../agents/housing');
const { buildVisionPrompt, generateVision } = require('../agents/vision');

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

const MOCK_URBAN_DESIGN = {
  summary: 'Integrate transit-oriented housing with shaded bike corridors and green infrastructure near BART.',
  strategy: {
    immediate: ['Protected bike lane pilot on Shattuck Ave', 'Street tree planting on priority blocks'],
    medium_term: ['Mixed-use housing on surface parking near BART', 'Bioswales in parking lot retrofits'],
    long_term: ['Continuous urban canopy and car-light district core'],
  },
  tradeoffs: [],
};

function assertContains(text, needle, label) {
  if (!text.includes(String(needle))) {
    console.error(`FAIL: Vision prompt missing ${label}: ${needle}`);
    process.exit(1);
  }
  console.log(`OK: prompt contains ${label}`);
}

(async () => {
  console.log('\n========== Fetching specialist agent outputs (Berkeley) ==========\n');

  const [climate, accessibility, housing] = await Promise.all([
    analyzeClimate({ site: BERKELEY_SITE, goal: GOAL }),
    analyzeAccessibility({ site: BERKELEY_SITE, goal: GOAL }),
    analyzeHousing({ site: BERKELEY_SITE, goal: GOAL }),
  ]);

  console.log('censusAvailable:', housing.censusAvailable);
  console.log('transitAvailable:', accessibility.transitAvailable);
  console.log('climateAvailable:', climate.climateAvailable);

  const prompt = buildVisionPrompt(
    { site: BERKELEY_SITE, goal: GOAL },
    { urbanDesign: MOCK_URBAN_DESIGN, climate, accessibility, housing },
  );

  console.log('\n========== Vision prompt (verified baselines section) ==========\n');
  const baselineStart = prompt.indexOf('Verified baselines:');
  const summaryStart = prompt.indexOf('Climate agent summary:');
  console.log(prompt.slice(baselineStart, summaryStart > baselineStart ? summaryStart : baselineStart + 800));

  console.log('\n========== Prompt content checks ==========\n');

  if (housing.censusAvailable && housing.censusData) {
    const rentFormatted = housing.censusData.medianRent?.toLocaleString('en-US');
    assertContains(prompt, `$${rentFormatted}`, 'censusData medianRent');
    assertContains(prompt, 'Median income:', 'census median income label');
  }

  if (accessibility.transitAvailable && accessibility.transitData) {
    assertContains(prompt, accessibility.transitData.nearbyStops800m, 'transitData nearbyStops800m');
    assertContains(prompt, 'Transit stops within 400m:', 'transit stops label');
  }

  if (climate.climateAvailable && climate.climateData) {
    if (climate.climateData.temperatureF != null) {
      assertContains(prompt, Math.round(climate.climateData.temperatureF), 'climateData temperatureF');
    }
    if (climate.climateData.usAqi != null) {
      assertContains(prompt, climate.climateData.usAqi, 'climateData usAqi');
    }
    if (climate.climateData.femaFloodZone != null) {
      assertContains(prompt, climate.climateData.femaFloodZone, 'climateData femaFloodZone');
    }
    if (climate.climateData.treeCanopyPercent != null) {
      assertContains(prompt, `${climate.climateData.treeCanopyPercent}%`, 'climateData treeCanopyPercent');
    }
  }

  console.log('\n========== Running generateVision() ==========\n');

  const scenarios = await generateVision(
    { site: BERKELEY_SITE, goal: GOAL },
    { urbanDesign: MOCK_URBAN_DESIGN, climate, accessibility, housing },
  );

  console.log('\n========== 2026 scenario output ==========\n');
  console.log(JSON.stringify(scenarios['2026'], null, 2));

  const changes = (scenarios['2026']?.projectedChanges || []).join(' ').toLowerCase();
  console.log('\n========== 2026 baseline reference checks ==========\n');

  if (climate.climateData?.treeCanopyPercent != null) {
    const canopyStr = String(climate.climateData.treeCanopyPercent);
    if (!changes.includes(canopyStr) && !changes.includes('nlcd')) {
      console.warn(`WARN: 2026 projectedChanges may not cite NLCD canopy (${canopyStr}%)`);
    } else {
      console.log('OK: 2026 references tree canopy baseline');
    }
  }

  if (accessibility.transitData?.nearbyStops800m != null) {
    const stops = String(accessibility.transitData.nearbyStops800m);
    if (changes.includes(stops) || changes.includes('800m') || changes.includes('transit')) {
      console.log('OK: 2026 references transit baseline');
    } else {
      console.warn(`WARN: 2026 projectedChanges may not cite transit stops (${stops})`);
    }
  }

  if (climate.climateData?.femaFloodZone != null) {
    const zone = climate.climateData.femaFloodZone.toLowerCase();
    if (changes.includes(zone) || changes.includes('fema') || changes.includes('flood zone')) {
      console.log('OK: 2026 references FEMA flood baseline');
    } else {
      console.warn(`WARN: 2026 projectedChanges may not cite FEMA zone (${climate.climateData.femaFloodZone})`);
    }
  }

  if (!scenarios['2026']) {
    console.error('FAIL: No 2026 scenario in Vision output');
    process.exit(1);
  }

  console.log('\nVerification complete.');
})();
