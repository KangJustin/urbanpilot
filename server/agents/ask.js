const { callText } = require('../services/claudeService');

const SYSTEM = `You are UrbanPilot AI, an urban planning copilot embedded in a site analysis tool. \
Answer the user's question concisely (2-4 sentences), concretely, and grounded ONLY in the provided \
analysis data. Cite specific numbers from the data when relevant. If the data doesn't cover the \
question, say so briefly rather than inventing specifics. Do not use markdown formatting.`;

function buildContext(site, data) {
  const allRecs = [
    ...(data?.agents?.climate?.recommendations || []),
    ...(data?.agents?.accessibility?.recommendations || []),
    ...(data?.agents?.housing?.recommendations || []),
  ];

  return `Site: ${site?.name || data?.site?.name}

Current conditions: Climate ${data?.currentConditions?.climateScore}, Accessibility ${data?.currentConditions?.accessibilityScore}, Housing ${data?.currentConditions?.housingScore}

Climate summary: ${data?.agents?.climate?.summary}
Accessibility summary: ${data?.agents?.accessibility?.summary}
Housing summary: ${data?.agents?.housing?.summary}
Urban design summary: ${data?.agents?.urban_design?.summary}

Top recommendations: ${allRecs.map(r => `${r.title} (${r.description})`).join('; ')}

2040 vision: ${data?.scenarios?.['2040']?.description}
2075 vision: ${data?.scenarios?.['2075']?.description}`;
}

async function answerQuestion({ question, site, data }) {
  const prompt = `${buildContext(site, data)}

Question: ${question}`;

  return callText(SYSTEM, prompt);
}

module.exports = { answerQuestion };
