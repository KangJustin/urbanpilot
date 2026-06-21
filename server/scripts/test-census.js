#!/usr/bin/env node
// Temporary manual test: node scripts/test-census.js
// Downtown Berkeley coordinates (default demo site).
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { getHousingMetrics } = require('../services/censusService');

const LAT = 37.8703;
const LON = -122.2677;

(async () => {
  console.log('\n=== Census ACS test: Downtown Berkeley ===');
  console.log(`Coordinates: ${LAT}, ${LON}\n`);

  try {
    const result = await getHousingMetrics(LAT, LON);
    console.log('\n=== Final result ===');
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('\n=== Test failed ===');
    console.error(err.message);
    process.exit(1);
  }
})();
