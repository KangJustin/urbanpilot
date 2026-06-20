const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function extractJSON(text) {
  try { return JSON.parse(text.trim()); } catch {}
  const codeMatch = text.match(/```(?:json)?\n?([\s\S]*?)\n?```/);
  if (codeMatch) { try { return JSON.parse(codeMatch[1]); } catch {} }
  const objMatch = text.match(/\{[\s\S]*\}/);
  if (objMatch) { try { return JSON.parse(objMatch[0]); } catch {} }
  throw new Error('No valid JSON found in agent response');
}

async function callAgent(systemPrompt, userMessage, model = 'claude-sonnet-4-6') {
  const response = await client.messages.create({
    model,
    max_tokens: model.includes('haiku') ? 1024 : 2048,
    system: [
      {
        type: 'text',
        text: systemPrompt,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [{ role: 'user', content: userMessage }],
  });

  const text = response.content[0].text;
  return extractJSON(text);
}

module.exports = { callAgent };
