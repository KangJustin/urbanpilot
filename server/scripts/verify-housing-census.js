#!/usr/bin/env node
// Verify Housing Agent JSON reliability: node scripts/verify-housing-census.js
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { getHousingMetrics } = require('../services/censusService');
const { analyzeHousing, buildResponseSchema, formatCensusBlock } = require('../agents/housing');

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
  console.log('\n========== ACS fetch (Downtown Berkeley) ==========\n');
  const censusData = await getHousingMetrics(BERKELEY_SITE.center.latitude, BERKELEY_SITE.center.longitude);
  const censusResult = { censusAvailable: true, censusData };

  const censusBlock = formatCensusBlock(censusData);
  const schema = buildResponseSchema(censusResult);

  console.log('\n========== Housing Agent user prompt (excerpt) ==========\n');
  console.log(`Site: ${BERKELEY_SITE.name} (${BERKELEY_SITE.center.latitude}, ${BERKELEY_SITE.center.longitude})`);
  console.log(`Planning goal: ${GOAL.description}\n`);
  console.log(censusBlock);
  console.log('\n--- Required JSON schema ---\n');
  console.log(schema);

  console.log('\n========== Running analyzeHousing() ==========\n');
  console.log('(Raw Claude response is logged by housing.js as [housing] Raw Claude response)\n');

  const housingResult = await analyzeHousing({ site: BERKELEY_SITE, goal: GOAL });

  console.log('\n========== Final Housing Agent output ==========\n');
  console.log(JSON.stringify(housingResult, null, 2));

  console.log('\n========== censusAvailable ==========\n');
  console.log(housingResult.censusAvailable);
  console.log('censusData.verified:', housingResult.censusData?.verified);
  console.log('censusData.source:', housingResult.censusData?.source);
  console.log('parseFallback:', housingResult.parseFallback || false);
})();
