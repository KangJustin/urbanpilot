const { Router } = require('express');
const { getLiveConditions } = require('../services/conditionsService');

const router = Router();

router.get('/conditions', async (req, res) => {
  const { lat, lon } = req.query;

  if (!lat || !lon) {
    return res.status(400).json({ error: 'lat and lon are required' });
  }

  try {
    const conditions = await getLiveConditions(lat, lon);
    res.json(conditions);
  } catch (err) {
    res.status(503).json({ error: err.message });
  }
});

module.exports = router;
