const { callAgent } = require('../services/claudeService');

const SYSTEM = `You are an expert urban housing analyst for urban planning. \
You analyze existing housing density, transit-oriented development potential, mixed-use opportunities, \
affordability pressures, displacement risk, and housing-climate tradeoffs. \
Return ONLY a valid JSON object. No explanation, no markdown, no other text.`;

async function analyzeHousing({ site, goal }) {
  const prompt = `Analyze housing potential and constraints for this site and planning goal.

Site: ${site.name} (${site.center.latitude}, ${site.center.longitude})
Planning goal: ${goal.description}

Use your knowledge of this location, local zoning context, and housing market conditions.

Return exactly this JSON (no other text):
{
  "score": <integer 0-100 representing current housing opportunity score>,
  "summary": "<2-3 sentence honest assessment>",
  "findings": ["<specific finding>", "<specific finding>", "<specific finding>", "<specific finding>"],
  "risks": [
    {"id": "hr1", "title": "<short title>", "description": "<1-2 sentences>", "severity": <1-5>, "category": "housing"},
    {"id": "hr2", "title": "<short title>", "description": "<1-2 sentences>", "severity": <1-5>, "category": "housing"}
  ],
  "recommendations": [
    {
      "id": "hrec1",
      "title": "<short action title>",
      "description": "<specific intervention>",
      "cost": "high",
      "timeline": "long_term",
      "priority": 1,
      "impact": {"climate": 4, "accessibility": 8, "housing": 38, "equity": 18}
    },
    {
      "id": "hrec2",
      "title": "<short action title>",
      "description": "<specific intervention>",
      "cost": "low",
      "timeline": "medium_term",
      "priority": 2,
      "impact": {"climate": 2, "accessibility": 4, "housing": 14, "equity": 9}
    }
  ]
}`;

  return callAgent(SYSTEM, prompt, 'claude-haiku-4-5-20251001');
}

module.exports = { analyzeHousing };
