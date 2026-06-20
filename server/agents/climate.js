const { callAgent } = require('../services/claudeService');

const SYSTEM = `You are an expert climate resilience analyst for urban planning. \
You analyze urban heat island exposure, flooding and stormwater risk, tree canopy coverage, \
impervious surface area, and green infrastructure potential. \
Return ONLY a valid JSON object. No explanation, no markdown, no other text.`;

async function analyzeClimate({ site, goal }) {
  const prompt = `Analyze climate resilience for this site and planning goal.

Site: ${site.name} (${site.center.latitude}, ${site.center.longitude})
Planning goal: ${goal.description}

Use your knowledge of this location and regional climate conditions.

Return exactly this JSON (no other text):
{
  "score": <integer 0-100 representing current climate resilience>,
  "summary": "<2-3 sentence honest assessment>",
  "findings": ["<specific finding>", "<specific finding>", "<specific finding>", "<specific finding>"],
  "risks": [
    {"id": "cr1", "title": "<short title>", "description": "<1-2 sentences>", "severity": <1-5>, "category": "climate"},
    {"id": "cr2", "title": "<short title>", "description": "<1-2 sentences>", "severity": <1-5>, "category": "climate"}
  ],
  "recommendations": [
    {
      "id": "crec1",
      "title": "<short action title>",
      "description": "<specific intervention>",
      "cost": "low",
      "timeline": "short_term",
      "priority": 1,
      "impact": {"climate": 25, "accessibility": 8, "housing": 0, "equity": 8}
    },
    {
      "id": "crec2",
      "title": "<short action title>",
      "description": "<specific intervention>",
      "cost": "medium",
      "timeline": "medium_term",
      "priority": 2,
      "impact": {"climate": 18, "accessibility": 4, "housing": 0, "equity": 5}
    }
  ]
}`;

  return callAgent(SYSTEM, prompt, 'claude-haiku-4-5-20251001');
}

module.exports = { analyzeClimate };
