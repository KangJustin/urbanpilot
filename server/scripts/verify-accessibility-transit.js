#!/usr/bin/env node
// Verify Accessibility Agent 511 GTFS grounding: node scripts/verify-accessibility-transit.js
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { getTransitMetrics } = require('../services/transit511Service');
const {
  analyzeAccessibility,
  buildResponseSchema,
  formatTransitBlock,
} = require('../agents/accessibility');

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
  console.log('\n========== 511 GTFS fetch (Downtown Berkeley) ==========\n');
  const transitResult = await getTransitMetrics(
    BERKELEY_SITE.center.latitude,
    BERKELEY_SITE.center.longitude,
  );

  console.log('\n========== Normalized transit metrics ==========\n');
  console.log(JSON.stringify(transitResult, null, 2));

  if (!transitResult.transitAvailable) {
    console.error('\nFAIL: transitAvailable is false — check TRANSIT_511_API_KEY and network.');
    process.exit(1);
  }

  const transitBlock = formatTransitBlock(transitResult.transitData);
  const schema = buildResponseSchema(transitResult);

  console.log('\n========== Accessibility Agent user prompt (excerpt) ==========\n');
  console.log(`Site: ${BERKELEY_SITE.name} (${BERKELEY_SITE.center.latitude}, ${BERKELEY_SITE.center.longitude})`);
  console.log(`Planning goal: ${GOAL.description}\n`);
  console.log(transitBlock);
  console.log('\n--- Required JSON schema ---\n');
  console.log(schema);

  console.log('\n========== Running analyzeAccessibility() ==========\n');
  console.log('(Raw Claude response is logged by accessibility.js as [accessibility] Raw Claude response)\n');

  const accessibilityResult = await analyzeAccessibility({ site: BERKELEY_SITE, goal: GOAL });

  console.log('\n========== Final Accessibility Agent output ==========\n');
  console.log(JSON.stringify(accessibilityResult, null, 2));

  console.log('\n========== transitAvailable ==========\n');
  console.log(accessibilityResult.transitAvailable);
  console.log('transitData.verified:', accessibilityResult.transitData?.verified);
  console.log('transitData.source:', accessibilityResult.transitData?.source);
  console.log('nearbyStops800m:', accessibilityResult.transitData?.nearbyStops800m);
  console.log('parseFallback:', accessibilityResult.parseFallback || false);

  if (!accessibilityResult.transitAvailable) {
    process.exit(1);
  }
})();
