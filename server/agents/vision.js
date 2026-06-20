const { callAgent } = require('../services/claudeService');

const SYSTEM = `You are an urban futurist and scenario planner. \
Given a set of urban planning interventions, you generate vivid, concrete, credible 2040 scenarios. \
Be specific about measurable changes. Avoid vague language. \
Return ONLY a valid JSON object. No explanation, no markdown, no other text.`;

async function generateVision({ site, goal }, { urbanDesign, climate, accessibility, housing }) {
  const prompt = `Generate a 2040 future scenario for this site after implementing the following plan.

Site: ${site.name}
Goal: ${goal.description}
Urban design strategy: ${urbanDesign.summary}

Immediate actions: ${urbanDesign.strategy.immediate.join('; ')}
Medium-term actions: ${urbanDesign.strategy.medium_term.join('; ')}
Long-term actions: ${urbanDesign.strategy.long_term.join('; ')}

Starting scores: Climate ${climate.score}, Accessibility ${accessibility.score}, Housing ${housing.score}

Write a vivid, specific 2040 scenario. Include concrete projected changes with before/after metrics.

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
  ]
}`;

  return callAgent(SYSTEM, prompt);
}

module.exports = { generateVision };
