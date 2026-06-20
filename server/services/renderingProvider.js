const midjourneyService = require('./midjourneyService');

// Thin FutureRenderingProvider abstraction over the working Midjourney MCP integration.
// If a licensed reference image is supplied, it's prepended to the prompt as a Midjourney
// composition reference (--iw weights how strongly it pulls vs the text). Google Maps/Street
// View imagery must never reach this function — only user-uploaded, license-confirmed images.
async function generateRendering({ prompt, referenceImage }) {
  const fullPrompt = referenceImage?.licenseConfirmed && referenceImage?.imageUrl
    ? `${referenceImage.imageUrl} ${prompt} --iw 1.5`
    : prompt;

  const { imageUrl, jobId, webUrl } = await midjourneyService.generateImage(fullPrompt);
  return { imageUrl, jobId, webUrl, provider: 'midjourney' };
}

module.exports = { generateRendering };
