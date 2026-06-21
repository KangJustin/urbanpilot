#!/usr/bin/env node
// Verify Climate Agent NLCD TCC grounding: node scripts/verify-climate-nlcd.js
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { getNlcdTreeCanopyMetrics, buildNlcdQueryUrl } = require('../services/nlcdTccService');
const { analyzeClimate } = require('../agents/climate');

const SITES = [
  {
    label: 'Downtown Berkeley',
    site: {
      name: 'Downtown Berkeley, CA',
      center: { latitude: 37.8703, longitude: -122.2677 },
    },
    expectLow: true,
  },
  {
    label: 'Tilden Park',
    site: {
      name: 'Tilden Regional Park, Berkeley, CA',
      center: { latitude: 37.894, longitude: -122.244 },
    },
    expectHigh: true,
  },
];

const GOAL = {
  primary: 'mixed_use_development',
  description: 'Add housing near transit while reducing heat and improving biking',
  priorities: [],
};

(async () => {
  console.log('\n========== NLCD TCC point queries ==========\n');

  for (const { label, site, expectLow, expectHigh } of SITES) {
    const { latitude, longitude } = site.center;
    console.log(`--- ${label} (${latitude}, ${longitude}) ---`);
    console.log('Query URL:', buildNlcdQueryUrl(latitude, longitude));

    const result = await getNlcdTreeCanopyMetrics(latitude, longitude);
    console.log(JSON.stringify(result, null, 2));

    if (!result.nlcdAvailable) {
      console.error(`FAIL: nlcdAvailable false for ${label}`);
      process.exit(1);
    }

    const pct = result.nlcdData.treeCanopyPercent;
    if (expectLow && pct > 30) {
      console.warn(`WARN: expected low canopy for ${label}, got ${pct}%`);
    }
    if (expectHigh && pct < 20) {
      console.error(`FAIL: expected high canopy for ${label}, got ${pct}%`);
      process.exit(1);
    }
    console.log('');
  }

  console.log('\n========== Running analyzeClimate() for Downtown Berkeley ==========\n');
  const climateAgentResult = await analyzeClimate({ site: SITES[0].site, goal: GOAL });

  console.log('\n========== Final Climate Agent output (Berkeley) ==========\n');
  console.log(JSON.stringify(climateAgentResult, null, 2));

  const cd = climateAgentResult.climateData || {};
  console.log('\n========== Verification checks ==========\n');
  console.log('climateAvailable:', climateAgentResult.climateAvailable);
  console.log('treeCanopyPercent:', cd.treeCanopyPercent);
  console.log('treeCanopyYear:', cd.treeCanopyYear);
  console.log('source includes NLCD:', cd.source?.includes('NLCD Tree Canopy Cover 2023 (USFS/MRLC)'));

  if (cd.treeCanopyPercent == null) {
    console.error('\nFAIL: treeCanopyPercent not attached to climateData.');
    process.exit(1);
  }
})();
