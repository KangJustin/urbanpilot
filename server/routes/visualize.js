const { Router } = require('express');
const { generateRendering } = require('../services/renderingProvider');

const router = Router();

router.post('/visualize', async (req, res) => {
  const { prompt, referenceImage } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'prompt is required' });
  }
  if (referenceImage && !referenceImage.licenseConfirmed) {
    return res.status(400).json({ error: 'referenceImage must have licenseConfirmed: true' });
  }

  try {
    const result = await generateRendering({ prompt, referenceImage });
    res.json(result);
  } catch (err) {
    res.status(503).json({ error: err.message });
  }
});

module.exports = router;
