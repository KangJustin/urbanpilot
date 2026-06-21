const { callAgent } = require('../services/claudeService');

const SYSTEM = `You are an expert urban design synthesizer for urban planning. \
You read specialist agent outputs, identify conflicts between climate, accessibility, and housing goals, \
resolve tradeoffs, and produce one coherent integrated strategy. \
Return ONLY a valid JSON object. No explanation, no markdown, no other text.`;

async function synthesizeUrbanDesign({ site, goal }, { climate, accessibility, housing }) {
  const prompt = `Synthesize a coherent urban design strategy for this site.

Site: ${site.name}
Planning goal: ${goal.description}

Specialist findings:
Climate (score ${climate.score}): ${climate.summary}
Accessibility (score ${accessibility.score}): ${accessibility.summary}
Housing (score ${housing.score}): ${housing.summary}

Identify the 1-2 most important conflicts between these goals and resolve them with a specific strategy.

Return exactly this JSON (no other text):
{
  "summary": "<3-4 sentence integrated strategy that acknowledges tradeoffs>",
  "strategy": {
    "immediate": ["<specific action>", "<specific action>", "<specific action>"],
    "medium_term": ["<specific action>", "<specific action>"],
    "long_term": ["<specific action>", "<specific action>"]
  },
  "tradeoffs": [
    {
      "issue": "<conflict title>",
      "competingPriorities": ["<priority 1>", "<priority 2>"],
      "resolution": "<concrete resolution with specific recommendation>"
    },
    {
      "issue": "<conflict title>",
      "competingPriorities": ["<priority 1>", "<priority 2>"],
      "resolution": "<concrete resolution with specific recommendation>"
    }
  ]
}`;

  return callAgent(SYSTEM, prompt, 'claude-haiku-4-5-20251001', 2048);
}

module.exports = { synthesizeUrbanDesign };
