const { callAgent } = require('../services/claudeService');

const SYSTEM = `You are an urban futurist, scenario planner, and architectural visualization director. \
Given a set of urban planning interventions, you generate vivid multi-decade future scenarios AND professional Midjourney visualization prompts. \
Be specific about measurable changes. Avoid vague language. \
Return ONLY a valid JSON object. No explanation, no markdown, no other text.`;

function scenarioSchema(year, label, intensity) {
  return `  "${year}": {
    "title": "<compelling ${year} scenario title>",
    "description": "<2-3 sentence vivid narrative in present tense, as if it is ${year}>",
    "climateScore": <0-100 integer, ${intensity}>,
    "accessibilityScore": <0-100 integer, ${intensity}>,
    "housingScore": <0-100 integer, ${intensity}>,
    "projectedChanges": [
      "<metric: before → after>",
      "<metric: before → after>",
      "<metric: before → after>"
    ],
    "visualizationPrompt": "Create a realistic architectural visualization of <site> in ${year}, ${label}. <3-4 specific visual elements drawn from the recommendations, scaled to this time horizon>. Professional urban planning rendering, architectural competition visualization, highly realistic, climate-tech future, detailed environmental design, cinematic golden hour daylight --ar 16:9 --v 7 --stylize 250"
  }`;
}

async function generateVision({ site, goal }, { urbanDesign, climate, accessibility, housing }) {
  const prompt = `Generate three future scenarios (2026, 2040, 2075) and visualization prompts for this site.

Site: ${site.name}
Goal: ${goal.description}
Urban design strategy: ${urbanDesign.summary}

Immediate actions: ${urbanDesign.strategy.immediate.join('; ')}
Medium-term actions: ${urbanDesign.strategy.medium_term.join('; ')}
Long-term actions: ${urbanDesign.strategy.long_term.join('; ')}

Climate findings: ${climate.summary}
Accessibility findings: ${accessibility.summary}
Housing findings: ${housing.summary}

Starting scores: Climate ${climate.score}, Accessibility ${accessibility.score}, Housing ${housing.score}

2026 = existing conditions today (scores should be close to the starting scores above, minimal change).
2040 = adaptive transition (immediate + medium-term actions largely complete, moderate score gains).
2075 = resilient future (the full long-term vision realized, scores near their practical ceiling).

Return exactly this JSON (no other text):
{
${scenarioSchema('2026', 'showing current/unimproved conditions', 'close to the starting scores')},
${scenarioSchema('2040', 'showing a moderately transformed streetscape', 'meaningfully higher than 2026')},
${scenarioSchema('2075', 'showing a fully realized, mature climate-resilient district', 'highest, near-ceiling scores')}
}

For each visualizationPrompt: replace placeholders with real specific visual elements from the recommendations (e.g. tree-lined protected bike lanes, mixed-use timber-frame buildings, green rooftops, bioswales), scaled appropriately to how much time has passed. Maintain recognizable Berkeley/Oakland characteristics: Bay Area architecture, Berkeley Hills backdrop, BART integration, local street character. Make each prompt vivid, specific, and visually distinct from the others.`;

  return callAgent(SYSTEM, prompt, 'claude-sonnet-4-6', 3072);
}

module.exports = { generateVision };
