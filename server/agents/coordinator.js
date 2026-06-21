const { analyzeClimate } = require('./climate');
const { analyzeAccessibility } = require('./accessibility');
const { analyzeHousing } = require('./housing');
const { synthesizeUrbanDesign } = require('./urbanDesign');
const { generateVision } = require('./vision');
const mockData = require('../../src/mock/berkeleyAnalysis.json');

// The bundled mock data is Berkeley-specific demo content. Using it as a fallback for any
// other location would silently show fabricated Berkeley numbers under a different address —
// only fall back to it when the request actually is Berkeley (the original demo site).
function isBerkeleySite(site) {
  const text = `${site?.name || ''} ${site?.city || ''}`.toLowerCase();
  return text.includes('berkeley');
}

function unavailableSection(label) {
  return {
    score: null,
    summary: `${label} analysis is temporarily unavailable for this location.`,
    findings: [],
    risks: [],
    recommendations: [],
    unavailable: true,
  };
}

function unavailableScenarios() {
  const placeholder = {
    title: 'Unavailable',
    description: 'A future scenario could not be generated for this location right now.',
    climateScore: null,
    accessibilityScore: null,
    housingScore: null,
    projectedChanges: [],
    unavailable: true,
  };
  return { '2026': placeholder, '2040': placeholder, '2075': placeholder };
}

async function runAnalysis(request) {
  const berkeley = isBerkeleySite(request.site);

  // Run specialist agents in parallel
  const [climate, accessibility, housing] = await Promise.all([
    analyzeClimate(request).catch(err => {
      console.warn('Climate agent failed:', err.message);
      return berkeley ? mockData.agents.climate : unavailableSection('Climate');
    }),
    analyzeAccessibility(request).catch(err => {
      console.warn('Accessibility agent failed:', err.message);
      return berkeley ? mockData.agents.accessibility : unavailableSection('Accessibility');
    }),
    analyzeHousing(request).catch(err => {
      console.warn('Housing agent failed:', err.message);
      return berkeley ? mockData.agents.housing : unavailableSection('Housing');
    }),
  ]);

  // Urban design synthesis
  const urbanDesign = await synthesizeUrbanDesign(request, { climate, accessibility, housing })
    .catch(err => {
      console.warn('Urban design agent failed:', err.message);
      return berkeley ? mockData.agents.urban_design : {
        summary: 'Urban design synthesis is temporarily unavailable for this location.',
        strategy: { immediate: [], medium_term: [], long_term: [] },
        tradeoffs: [],
        unavailable: true,
      };
    });

  // 2026/2040/2075 scenario vision
  const scenarios = await generateVision(request, { climate, accessibility, housing, urbanDesign })
    .catch(err => {
      console.warn('Vision agent failed:', err.message);
      return berkeley ? mockData.scenarios : unavailableScenarios();
    });

  const validScores = [climate.score, accessibility.score, housing.score].filter(s => s != null);
  const overallScore = validScores.length
    ? Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length)
    : null;

  const realDataUsed = [
    'Google Places location data (address, coordinates)',
    'OpenStreetMap/CARTO basemap',
    ...(climate.climateAvailable ? ['Open-Meteo Weather API', 'Open-Meteo Air Quality API'] : []),
    ...(housing.censusAvailable ? [`U.S. Census Bureau ${housing.censusData?.source || 'ACS 5-Year'} (block group ${housing.censusData?.geography?.geoid || 'unknown'})`] : []),
    ...(accessibility.transitAvailable ? ['511 SF Bay Regional GTFS'] : []),
  ];

  const estimatedData = [
    'All scores, findings, and recommendations are AI-generated estimates based on Claude\'s knowledge of the site',
  ];
  if (!climate.climateAvailable) {
    estimatedData.push('Current weather and air quality (Open-Meteo unavailable)');
  }
  if (!housing.censusAvailable) {
    estimatedData.push('Housing baseline statistics (Census ACS unavailable)');
  }
  if (!accessibility.transitAvailable) {
    estimatedData.push('Transit access statistics (511 SF Bay GTFS unavailable for this location)');
  }

  return {
    site: request.site,
    currentConditions: {
      climateScore: climate.score,
      accessibilityScore: accessibility.score,
      housingScore: housing.score,
      overallScore,
    },
    agents: {
      climate,
      accessibility,
      housing,
      urban_design: urbanDesign,
    },
    scenarios,
    dataDisclosure: {
      realDataUsed,
      estimatedData,
      limitations: [
        climate.climateAvailable || housing.censusAvailable || accessibility.transitAvailable
          ? 'Scores and planning recommendations are AI-generated for exploration. '
            + 'Open-Meteo current weather and US AQI are verified when climateAvailable is true. '
            + 'Census ACS housing metrics are verified when censusAvailable is true. '
            + '511 SF Bay transit proximity metrics are verified when transitAvailable is true.'
          : 'Values are AI-generated estimates for planning exploration. Not verified planning data.',
      ],
    },
  };
}

module.exports = { runAnalysis };
