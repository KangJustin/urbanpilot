const { analyzeClimate } = require('./climate');
const { analyzeAccessibility } = require('./accessibility');
const { analyzeHousing } = require('./housing');
const { synthesizeUrbanDesign } = require('./urbanDesign');
const { generateVision } = require('./vision');

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
  // Run specialist agents in parallel
  const [climate, accessibility, housing] = await Promise.all([
    analyzeClimate(request).catch(err => {
      console.warn('Climate agent failed:', err.message);
      return unavailableSection('Climate');
    }),
    analyzeAccessibility(request).catch(err => {
      console.warn('Accessibility agent failed:', err.message);
      return unavailableSection('Accessibility');
    }),
    analyzeHousing(request).catch(err => {
      console.warn('Housing agent failed:', err.message);
      return unavailableSection('Housing');
    }),
  ]);

  // Urban design synthesis
  const urbanDesign = await synthesizeUrbanDesign(request, { climate, accessibility, housing })
    .catch(err => {
      console.warn('Urban design agent failed:', err.message);
      return {
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
      return unavailableScenarios();
    });

  const validScores = [climate.score, accessibility.score, housing.score].filter(s => s != null);
  const overallScore = validScores.length
    ? Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length)
    : null;

  const hasFemaData = climate.climateData?.femaFloodZone != null;
  const hasNlcdCanopy = climate.climateData?.treeCanopyPercent != null;

  const realDataUsed = [
    'Google Places location data (address, coordinates)',
    'OpenStreetMap/CARTO basemap',
    ...(climate.climateAvailable && climate.climateData?.temperatureF != null
      ? ['Open-Meteo Weather API']
      : []),
    ...(climate.climateAvailable && climate.climateData?.usAqi != null
      ? ['Open-Meteo Air Quality API']
      : []),
    ...(hasFemaData ? ['FEMA National Flood Hazard Layer'] : []),
    ...(hasNlcdCanopy ? ['NLCD Tree Canopy Cover 2023 (USFS/MRLC)'] : []),
    ...(housing.censusAvailable ? [`U.S. Census Bureau ${housing.censusData?.source || 'ACS 5-Year'} (block group ${housing.censusData?.geography?.geoid || 'unknown'})`] : []),
    ...(accessibility.transitAvailable ? ['511 SF Bay Regional GTFS'] : []),
  ];

  const estimatedData = [
    'All scores, findings, and recommendations are AI-generated estimates based on Claude\'s knowledge of the site',
  ];
  if (!climate.climateAvailable) {
    estimatedData.push('Current weather, air quality, and flood zone (Open-Meteo/FEMA unavailable)');
  } else {
    if (climate.climateData?.temperatureF == null && climate.climateData?.usAqi == null) {
      estimatedData.push('Current weather and air quality (Open-Meteo unavailable)');
    }
    if (!hasFemaData) {
      estimatedData.push('FEMA flood zone (NFHL unavailable for this location)');
    }
    if (!hasNlcdCanopy) {
      estimatedData.push('NLCD tree canopy (CONUS ImageServer unavailable for this location)');
    }
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
            + 'Open-Meteo current weather and US AQI are verified when present in climateData. '
            + 'FEMA NFHL flood zone and SFHA status are verified when present in climateData. '
            + 'NLCD tree canopy percent (30m pixel, 2023) is verified when present in climateData. '
            + 'Census ACS housing metrics are verified when censusAvailable is true. '
            + '511 SF Bay transit proximity metrics are verified when transitAvailable is true.'
          : 'Values are AI-generated estimates for planning exploration. Not verified planning data.',
      ],
    },
  };
}

module.exports = { runAnalysis };
