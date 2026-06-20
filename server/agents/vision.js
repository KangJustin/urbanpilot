const { callAgent } = require('../services/claudeService');

const SYSTEM = `You are an urban futurist, scenario planner, and architectural visualization director. \
Given a set of urban planning interventions, you generate vivid 2040 scenarios AND professional Midjourney visualization prompts. \
Be specific about measurable changes. Avoid vague language. \
Return ONLY a valid JSON object. No explanation, no markdown, no other text.`;

async function generateVision({ site, goal }, { urbanDesign, climate, accessibility, housing }) {
  const prompt = `Generate a 2040 future scenario and visualization prompt for this site.

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

Return exactly this JSON (no other text):
{
  "title": "<compelling 2040 scenario title>",
  "description": "<3-4 sentence vivid future narrative in present tense, as if it is 2040>",
  "projectedChanges": [
    "<metric: before → after>",
    "<metric: before → after>",
    "<metric: before → after>",
    "<metric: before → after>",
    "<metric: before → after>"
  ],
  "visualizationPrompt": "Create a realistic architectural visualization of ${site.name} in 2040. Show a climate-resilient urban district featuring: <3-4 specific visual elements drawn from the climate, accessibility, and housing recommendations>. Include mixed-use development, active transportation infrastructure, shaded pedestrian corridors, climate adaptation measures, and visible public realm improvements. Maintain recognizable Berkeley/Oakland characteristics: Bay Area architecture, Berkeley Hills backdrop, BART integration, local street character. Professional urban planning rendering, architectural competition visualization, highly realistic, optimistic but believable, climate-tech future, detailed environmental design, cinematic golden hour daylight --ar 16:9 --v 7 --stylize 250"
}

For visualizationPrompt: replace the placeholder with real specific visual elements from the recommendations (e.g. tree-lined protected bike lanes, mixed-use timber-frame buildings, green rooftops, bioswales along the sidewalk). Make it vivid and specific to this site and plan.`;

  return callAgent(SYSTEM, prompt);
}

module.exports = { generateVision };
