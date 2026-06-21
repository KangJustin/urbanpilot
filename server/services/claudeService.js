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

async function callAgentRaw(systemPrompt, userMessage, model = 'claude-sonnet-4-6', maxTokens) {
  const response = await client.messages.create({
    model,
    max_tokens: maxTokens || (model.includes('haiku') ? 1024 : 2048),
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
  return { text, model, stopReason: response.stop_reason };
}

async function callAgent(systemPrompt, userMessage, model = 'claude-sonnet-4-6', maxTokens) {
  const { text } = await callAgentRaw(systemPrompt, userMessage, model, maxTokens);
  return extractJSON(text);
}

async function callText(systemPrompt, userMessage, model = 'claude-sonnet-4-6', maxTokens = 512) {
  const response = await client.messages.create({
    model,
    max_tokens: maxTokens,
    system: [
      {
        type: 'text',
        text: systemPrompt,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [{ role: 'user', content: userMessage }],
  });

  return response.content[0].text.trim();
}

module.exports = { callAgent, callAgentRaw, callText, extractJSON };
