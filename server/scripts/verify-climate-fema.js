#!/usr/bin/env node
// Verify Climate Agent FEMA NFHL grounding: node scripts/verify-climate-fema.js
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { getFemaFloodMetrics, buildFemaQueryUrl } = require('../services/femaNfhlService');
const { analyzeClimate } = require('../agents/climate');

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

(async () => {
  const { latitude, longitude } = BERKELEY_SITE.center;

  console.log('\n========== FEMA NFHL query (Downtown Berkeley) ==========\n');
  console.log('Query URL:', buildFemaQueryUrl(latitude, longitude));

  const femaResult = await getFemaFloodMetrics(latitude, longitude);

  console.log('\n========== Normalized FEMA flood response ==========\n');
  console.log(JSON.stringify(femaResult, null, 2));

  if (!femaResult.femaAvailable) {
    console.error('\nFAIL: femaAvailable is false — check network or coordinates.');
    process.exit(1);
  }

  console.log('\n========== Running analyzeClimate() ==========\n');
  console.log('(Raw Claude response is logged by climate.js as [climate] Raw Claude response)\n');

  const climateAgentResult = await analyzeClimate({ site: BERKELEY_SITE, goal: GOAL });

  console.log('\n========== Final Climate Agent output ==========\n');
  console.log(JSON.stringify(climateAgentResult, null, 2));

  const cd = climateAgentResult.climateData || {};
  console.log('\n========== Verification checks ==========\n');
  console.log('climateAvailable:', climateAgentResult.climateAvailable);
  console.log('femaFloodZone:', cd.femaFloodZone);
  console.log('femaFloodRisk:', cd.femaFloodRisk);
  console.log('inSpecialFloodHazardArea:', cd.inSpecialFloodHazardArea);
  console.log('baseFloodElevationFt:', cd.baseFloodElevationFt);
  console.log('source includes FEMA:', cd.source?.includes('FEMA National Flood Hazard Layer'));
  console.log('parseFallback:', climateAgentResult.parseFallback || false);

  const ok = climateAgentResult.climateAvailable
    && cd.femaFloodZone
    && cd.femaFloodRisk
    && cd.inSpecialFloodHazardArea != null
    && cd.source?.includes('FEMA National Flood Hazard Layer');

  if (!ok) {
    console.error('\nFAIL: FEMA fields not attached to climateData.');
    process.exit(1);
  }
})();
