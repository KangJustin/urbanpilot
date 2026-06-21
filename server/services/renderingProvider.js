const midjourneyService = require('./midjourneyService');

// Midjourney rejects reference image URLs it can't fetch over the public internet — that's
// expected in local dev, where our image-proxy URLs point at localhost or a LAN IP. Once
// deployed somewhere with a real public URL, the same reference will work without any change
// here. Match on the error patterns Midjourney returns for an unusable reference URL.
const UNFETCHABLE_REFERENCE_PATTERN = /invalid url|could not fetch image/i;

const SITE_FIDELITY_WRAPPER =
  'Preserve the existing street layout, building massing, camera angle, transit infrastructure, and geographic context. '
  + 'Do not relocate the site. Do not substitute another city, downtown, skyline, landmark, or street network. '
  + 'Apply only the changes explicitly described in the scenario.';

function isPrivateIpv4(hostname) {
  const parts = hostname.split('.');
  if (parts.length !== 4 || parts.some((p) => !/^\d+$/.test(p))) return false;
  const [a, b] = parts.map(Number);
  if (a === 10) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 169 && b === 254) return true;
  return false;
}

function isPubliclyReachableReferenceUrl(imageUrl) {
  let url;
  try {
    url = new URL(imageUrl);
  } catch {
    return { accepted: false, reason: 'invalid reference URL' };
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return { accepted: false, reason: `unsupported protocol: ${url.protocol}` };
  }

  const host = url.hostname.toLowerCase();

  if (host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '[::1]') {
    return { accepted: false, reason: `non-public host: ${host}` };
  }

  if (isPrivateIpv4(host)) {
    return { accepted: false, reason: `private LAN host: ${host}` };
  }

  return { accepted: true, reason: null };
}

function wrapVisualizationPrompt(prompt) {
  return `${SITE_FIDELITY_WRAPPER} ${prompt}`;
}

function resolveReferenceImage(referenceImage) {
  if (!referenceImage?.imageUrl) {
    console.log('[rendering] reference image skipped: no reference supplied');
    return null;
  }

  if (!referenceImage.licenseConfirmed) {
    console.log('[rendering] reference image skipped: licenseConfirmed not true');
    return null;
  }

  const check = isPubliclyReachableReferenceUrl(referenceImage.imageUrl);
  if (!check.accepted) {
    console.log(
      `[rendering] reference image skipped: ${referenceImage.imageUrl} — reason: ${check.reason}`,
    );
    return null;
  }

  console.log(`[rendering] reference image accepted: ${referenceImage.imageUrl}`);
  return referenceImage.imageUrl;
}

// Thin FutureRenderingProvider abstraction over the working Midjourney MCP integration.
// If a licensed, publicly reachable reference image is supplied, it's prepended to the prompt
// as a Midjourney composition reference (--iw weights how strongly it pulls vs the text).
async function generateRendering({ prompt, referenceImage }) {
  const wrappedPrompt = wrapVisualizationPrompt(prompt);
  const referenceUrl = resolveReferenceImage(referenceImage);
  const fullPrompt = referenceUrl ? `${referenceUrl} ${wrappedPrompt} --iw 1.5` : wrappedPrompt;

  // The scenario year (2026/2040/2075) is embedded in the prompt text itself (vision.js writes
  // "...in ${year}, ..." directly into visualizationPrompt), so logging the final prompt here
  // covers all scenarios without needing a year field on the /api/visualize request — no API
  // contract change required.
  console.log('[rendering] Final prompt sent to Midjourney:\n', fullPrompt);

  try {
    const { imageUrl, jobId, webUrl } = await midjourneyService.generateImage(fullPrompt);
    return { imageUrl, jobId, webUrl, provider: 'midjourney' };
  } catch (err) {
    if (referenceUrl && UNFETCHABLE_REFERENCE_PATTERN.test(err.message)) {
      console.warn(
        '[rendering] reference image fetch failed at Midjourney, retrying text-only with fidelity wrapper:',
        err.message,
      );
      console.log('[rendering] Final prompt sent to Midjourney (text-only retry):\n', wrappedPrompt);
      const { imageUrl, jobId, webUrl } = await midjourneyService.generateImage(wrappedPrompt);
      return { imageUrl, jobId, webUrl, provider: 'midjourney' };
    }
    throw err;
  }
}

module.exports = {
  generateRendering,
  isPubliclyReachableReferenceUrl,
  wrapVisualizationPrompt,
  SITE_FIDELITY_WRAPPER,
};
