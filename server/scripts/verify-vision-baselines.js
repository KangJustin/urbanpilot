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

  // Restraint checks (exaggerated-imagery fix) — banned terms must never appear in the 2040/2075
  // visualizationPrompt, and the prompt must carry the lowered --stylize value, not the old 250.
  const BANNED_TERMS = [
    'skyscraper', 'glass tower', 'waterfall', 'hyperloop', 'flying vehicle', 'flying car',
    'monorail', 'megastructure', 'mega-structure', 'sci-fi', 'futuristic skyline', 'utopia',
  ];

  console.log('\n========== 2040/2075 restraint checks ==========\n');
  let restraintFailed = false;
  for (const year of ['2040', '2075']) {
    const vp = scenarios[year]?.visualizationPrompt || '';
    console.log(`--- ${year} visualizationPrompt ---\n${vp}\n`);

    const lower = vp.toLowerCase();
    // Split into clauses on sentence/clause boundaries so a negation anywhere in the same clause
    // counts — e.g. "no skyscrapers or glass towers" negates "glass towers" even though "no" is
    // several words earlier, separated by another listed item.
    const clauses = lower.split(/[.;—]\s*|,\s*(?=no |not |without |never )/);
    const NEGATION_WORDS = ['no ', 'not ', 'without ', 'never '];
    const hit = BANNED_TERMS.find((term) => {
      if (!lower.includes(term)) return false;
      const clause = clauses.find((c) => c.includes(term));
      const negated = clause != null && NEGATION_WORDS.some((w) => clause.includes(w));
      return !negated; // only a real hit if NOT explicitly negated/excluded in its clause
    });
    if (hit) {
      console.error(`FAIL: ${year} visualizationPrompt contains banned term "${hit}" (not negated)`);
      restraintFailed = true;
    } else {
      console.log(`OK: ${year} visualizationPrompt has no (non-negated) banned exaggeration terms`);
    }

    if (/--stylize\s+250\b/.test(vp)) {
      console.error(`FAIL: ${year} visualizationPrompt still uses the old --stylize 250`);
      restraintFailed = true;
    } else if (/--stylize\s+150\b/.test(vp)) {
      console.log(`OK: ${year} visualizationPrompt uses the lowered --stylize 150`);
    } else {
      console.warn(`WARN: ${year} visualizationPrompt --stylize value not found/unexpected`);
    }
  }

  if (restraintFailed) {
    console.error('\nFAIL: restraint checks did not pass — see above.');
    process.exit(1);
  }

  console.log('\nVerification complete.');
})();
