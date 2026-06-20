const { getClient } = require('./midjourneyMcpClient');

function extractResult(toolResult) {
  if (toolResult.isError) {
    const message = toolResult.content?.find(c => c.type === 'text')?.text || 'Midjourney generation failed';
    throw new Error(message);
  }
  const textBlock = toolResult.content?.find(c => c.type === 'text');
  const parsed = textBlock ? JSON.parse(textBlock.text) : toolResult.structuredContent;
  const firstImage = parsed?.images?.[0];
  if (!firstImage) throw new Error('Midjourney response did not include an image');
  return { imageUrl: firstImage.cdn_url, jobId: parsed.job_id, webUrl: parsed.web_url };
}

async function generateImage(prompt) {
  const client = await getClient();
  const result = await client.callTool({ name: 'generate_image', arguments: { prompt } });
  return extractResult(result);
}

module.exports = { generateImage };
