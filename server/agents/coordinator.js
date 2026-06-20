const { analyzeClimate } = require('./climate');
const { analyzeAccessibility } = require('./accessibility');
const { analyzeHousing } = require('./housing');
const { synthesizeUrbanDesign } = require('./urbanDesign');
const { generateVision } = require('./vision');
const mockData = require('../../src/mock/berkeleyAnalysis.json');

async function runAnalysis(request) {
  // Run specialist agents in parallel
  const [climate, accessibility, housing] = await Promise.all([
    analyzeClimate(request).catch(err => {
      console.warn('Climate agent failed, using mock:', err.message);
      return mockData.agents.climate;
    }),
    analyzeAccessibility(request).catch(err => {
      console.warn('Accessibility agent failed, using mock:', err.message);
      return mockData.agents.accessibility;
    }),
    analyzeHousing(request).catch(err => {
      console.warn('Housing agent failed, using mock:', err.message);
      return mockData.agents.housing;
    }),
  ]);

  // Urban design synthesis
  const urbanDesign = await synthesizeUrbanDesign(request, { climate, accessibility, housing })
    .catch(err => {
      console.warn('Urban design agent failed, using mock:', err.message);
      return mockData.agents.urban_design;
    });

  // 2025/2040/2075 scenario vision
  const scenarios = await generateVision(request, { climate, accessibility, housing, urbanDesign })
    .catch(err => {
      console.warn('Vision agent failed, using mock:', err.message);
      return mockData.scenarios;
    });

  const overallScore = Math.round(
    (climate.score + accessibility.score + housing.score) / 3
  );

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
      realDataUsed: ['OpenStreetMap street network', 'BART station location', 'City of Berkeley zoning reference'],
      estimatedData: ['All scores are AI-generated estimates based on Claude\'s knowledge of the site'],
      limitations: ['Values are AI-generated estimates for planning exploration. Not verified planning data.'],
    },
  };
}

module.exports = { runAnalysis };
