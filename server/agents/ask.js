const { callText } = require('../services/claudeService');
const { formatVerifiedBaselines } = require('./vision');

const SYSTEM = `You are UrbanPilot AI, an urban planning copilot embedded in a site analysis tool. \
Answer the user's question concisely (2-4 sentences), concretely, and grounded ONLY in the provided \
analysis data. \
When verified ACS, GTFS, Open-Meteo, FEMA, or NLCD baseline metrics are present, cite those exact values. \
Prefer structured verified data over agent summaries if there is a conflict. \
Agent scores (Climate, Accessibility, Housing) are AI-estimated — label them as such when citing scores. \
2040 and 2075 scenario descriptions and projectedChanges beyond the 2026 baseline are projections, not verified data. \
If verified data for a question is unavailable in the context, say so briefly rather than inventing specifics. \
Do not use markdown formatting.`;

function formatList(items) {
  if (!items?.length) return 'none listed';
  return items.map((item) => `- ${item}`).join('\n');
}

function buildContext(site, data) {
  const housing = data?.agents?.housing;
  const accessibility = data?.agents?.accessibility;
  const climate = data?.agents?.climate;
  const verifiedBaselines = formatVerifiedBaselines(housing, accessibility, climate);

  const scenario2026 = data?.scenarios?.['2026'];
  const projected2026 = scenario2026?.projectedChanges?.length
    ? scenario2026.projectedChanges.map((line) => `- ${line}`).join('\n')
    : 'none listed';

  const disclosure = data?.dataDisclosure || {};
  const realDataUsed = formatList(disclosure.realDataUsed);
  const estimatedData = formatList(disclosure.estimatedData);
  const limitations = disclosure.limitations?.join(' ') || 'none listed';

  const allRecs = [
    ...(climate?.recommendations || []),
    ...(accessibility?.recommendations || []),
    ...(housing?.recommendations || []),
  ];

  return `Site: ${site?.name || data?.site?.name}

${verifiedBaselines}

2026 verified scenario baselines (projectedChanges):
${projected2026}

Data disclosure:
Real data used:
${realDataUsed}

Estimated / AI-generated data:
${estimatedData}

Limitations: ${limitations}

AI-estimated current scores: Climate ${data?.currentConditions?.climateScore ?? 'N/A'}, Accessibility ${data?.currentConditions?.accessibilityScore ?? 'N/A'}, Housing ${data?.currentConditions?.housingScore ?? 'N/A'}

Climate agent summary: ${climate?.summary || 'Not available'}
Accessibility agent summary: ${accessibility?.summary || 'Not available'}
Housing agent summary: ${housing?.summary || 'Not available'}
Urban design summary: ${data?.agents?.urban_design?.summary || 'Not available'}

Top recommendations: ${allRecs.length ? allRecs.map((r) => `${r.title} (${r.description})`).join('; ') : 'none listed'}

2040 projected vision: ${data?.scenarios?.['2040']?.description || 'Not available'}
2075 projected vision: ${data?.scenarios?.['2075']?.description || 'Not available'}`;
}

async function answerQuestion({ question, site, data }) {
  const prompt = `${buildContext(site, data)}

Question: ${question}`;

  const answer = await callText(SYSTEM, prompt);
  return { answer };
}

module.exports = { answerQuestion, buildContext };
