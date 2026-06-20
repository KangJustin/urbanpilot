const { Router } = require('express');
const { generateImage } = require('../services/midjourneyService');

const router = Router();

router.post('/visualize', async (req, res) => {
  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'prompt is required' });
  }

  try {
    const result = await generateImage(prompt);
    res.json(result);
  } catch (err) {
    res.status(503).json({ error: err.message });
  }
});

module.exports = router;
