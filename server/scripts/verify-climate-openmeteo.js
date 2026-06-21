#!/usr/bin/env node
// Verify Climate Agent Open-Meteo grounding: node scripts/verify-climate-openmeteo.js
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { getOpenMeteoClimateMetrics } = require('../services/openMeteoService');
const {
  analyzeClimate,
  buildResponseSchema,
  formatClimateBlock,
} = require('../agents/climate');

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
  console.log('\n========== Open-Meteo fetch (Downtown Berkeley) ==========\n');
  const climateResult = await getOpenMeteoClimateMetrics(
    BERKELEY_SITE.center.latitude,
    BERKELEY_SITE.center.longitude,
  );

  console.log('\n========== Normalized climateData ==========\n');
  console.log(JSON.stringify(climateResult, null, 2));

  if (!climateResult.climateAvailable) {
    console.error('\nFAIL: climateAvailable is false — check network.');
    process.exit(1);
  }

  const climateBlock = formatClimateBlock(climateResult.climateData);
  const schema = buildResponseSchema(climateResult);

  console.log('\n========== Climate Agent user prompt (excerpt) ==========\n');
  console.log(`Site: ${BERKELEY_SITE.name} (${BERKELEY_SITE.center.latitude}, ${BERKELEY_SITE.center.longitude})`);
  console.log(`Planning goal: ${GOAL.description}\n`);
  console.log(climateBlock);
  console.log('\n--- Required JSON schema ---\n');
  console.log(schema);

  console.log('\n========== Running analyzeClimate() ==========\n');
  console.log('(Raw Claude response is logged by climate.js as [climate] Raw Claude response)\n');

  const climateAgentResult = await analyzeClimate({ site: BERKELEY_SITE, goal: GOAL });

  console.log('\n========== Final Climate Agent output ==========\n');
  console.log(JSON.stringify(climateAgentResult, null, 2));

  console.log('\n========== climateAvailable ==========\n');
  console.log(climateAgentResult.climateAvailable);
  console.log('climateData.verified:', climateAgentResult.climateData?.verified);
  console.log('climateData.temperatureF:', climateAgentResult.climateData?.temperatureF);
  console.log('climateData.usAqi:', climateAgentResult.climateData?.usAqi);
  console.log('parseFallback:', climateAgentResult.parseFallback || false);

  if (!climateAgentResult.climateAvailable) {
    process.exit(1);
  }
})();
