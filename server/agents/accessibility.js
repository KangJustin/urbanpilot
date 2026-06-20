const { callAgent } = require('../services/claudeService');

const SYSTEM = `You are an expert urban accessibility analyst for urban planning. \
You analyze walkability, ADA and mobility barriers, transit access, bicycle connectivity, \
pedestrian safety, and proximity to essential services. \
Return ONLY a valid JSON object. No explanation, no markdown, no other text.`;

async function analyzeAccessibility({ site, goal }) {
  const prompt = `Analyze accessibility and mobility for this site and planning goal.

Site: ${site.name} (${site.center.latitude}, ${site.center.longitude})
Planning goal: ${goal.description}

Use your knowledge of this location, its transit infrastructure, and street network.

Return exactly this JSON (no other text):
{
  "score": <integer 0-100 representing current accessibility>,
  "summary": "<2-3 sentence honest assessment>",
  "findings": ["<specific finding>", "<specific finding>", "<specific finding>", "<specific finding>"],
  "risks": [
    {"id": "ar1", "title": "<short title>", "description": "<1-2 sentences>", "severity": <1-5>, "category": "accessibility"},
    {"id": "ar2", "title": "<short title>", "description": "<1-2 sentences>", "severity": <1-5>, "category": "accessibility"}
  ],
  "recommendations": [
    {
      "id": "arec1",
      "title": "<short action title>",
      "description": "<specific intervention>",
      "cost": "medium",
      "timeline": "short_term",
      "priority": 1,
      "impact": {"climate": 6, "accessibility": 28, "housing": 4, "equity": 14}
    },
    {
      "id": "arec2",
      "title": "<short action title>",
      "description": "<specific intervention>",
      "cost": "low",
      "timeline": "short_term",
      "priority": 2,
      "impact": {"climate": 0, "accessibility": 18, "housing": 0, "equity": 16}
    }
  ]
}`;

  return callAgent(SYSTEM, prompt);
}

module.exports = { analyzeAccessibility };
