const midjourneyService = require('./midjourneyService');

// Midjourney rejects reference image URLs it can't fetch over the public internet — that's
// expected in local dev, where our image-proxy URLs point at localhost or a LAN IP. Once
// deployed somewhere with a real public URL, the same reference will work without any change
// here. Match on the error patterns Midjourney returns for an unusable reference URL.
const UNFETCHABLE_REFERENCE_PATTERN = /invalid url|could not fetch image/i;

// Thin FutureRenderingProvider abstraction over the working Midjourney MCP integration.
// If a licensed reference image is supplied, it's prepended to the prompt as a Midjourney
// composition reference (--iw weights how strongly it pulls vs the text).
async function generateRendering({ prompt, referenceImage }) {
  const hasReference = !!(referenceImage?.licenseConfirmed && referenceImage?.imageUrl);
  const fullPrompt = hasReference ? `${referenceImage.imageUrl} ${prompt} --iw 1.5` : prompt;

  try {
    const { imageUrl, jobId, webUrl } = await midjourneyService.generateImage(fullPrompt);
    return { imageUrl, jobId, webUrl, provider: 'midjourney' };
  } catch (err) {
    if (hasReference && UNFETCHABLE_REFERENCE_PATTERN.test(err.message)) {
      console.warn('Reference image was not fetchable by Midjourney (expected in local dev), retrying text-only:', err.message);
      const { imageUrl, jobId, webUrl } = await midjourneyService.generateImage(prompt);
      return { imageUrl, jobId, webUrl, provider: 'midjourney' };
    }
    throw err;
  }
}

module.exports = { generateRendering };
