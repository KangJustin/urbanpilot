const Anthropic = require('@anthropic-ai/sdk');

// the-token-company is ESM-only, so it must be loaded via dynamic import() from this
// CommonJS module; the client is memoized on first use rather than built at require time.
let clientPromise;
function getClient() {
  if (!clientPromise) {
    clientPromise = import('the-token-company/anthropic').then(({ withCompression }) => withCompression(
      new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }),
      { compressionApiKey: process.env.TTC_API_KEY },
    ));
  }
  return clientPromise;
}

function extractJSON(text) {
  try { return JSON.parse(text.trim()); } catch {}
  const codeMatch = text.match(/```(?:json)?\n?([\s\S]*?)\n?```/);
  if (codeMatch) { try { return JSON.parse(codeMatch[1]); } catch {} }
  const objMatch = text.match(/\{[\s\S]*\}/);
  if (objMatch) { try { return JSON.parse(objMatch[0]); } catch {} }
  throw new Error('No valid JSON found in agent response');
}

async function callAgentRaw(systemPrompt, userMessage, model = 'claude-sonnet-4-6', maxTokens) {
  const client = await getClient();
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
  console.log(`[claudeService] TTC compression: ${client.compression.totalTokensSaved} tokens saved so far (ratio ${client.compression.ratio.toFixed(2)}x, ${client.compression.calls} calls)`);

  const text = response.content[0].text;
  return { text, model, stopReason: response.stop_reason };
}

async function callAgent(systemPrompt, userMessage, model = 'claude-sonnet-4-6', maxTokens) {
  const { text } = await callAgentRaw(systemPrompt, userMessage, model, maxTokens);
  return extractJSON(text);
}

async function callText(systemPrompt, userMessage, model = 'claude-sonnet-4-6', maxTokens = 512) {
  const client = await getClient();
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
  console.log(`[claudeService] TTC compression: ${client.compression.totalTokensSaved} tokens saved so far (ratio ${client.compression.ratio.toFixed(2)}x, ${client.compression.calls} calls)`);

  return response.content[0].text.trim();
}

module.exports = { callAgent, callAgentRaw, callText, extractJSON };
