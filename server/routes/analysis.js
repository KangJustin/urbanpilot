const { Router } = require('express');
const { runAnalysis } = require('../agents/coordinator');
const mockData = require('../../src/mock/berkeleyAnalysis.json');

const router = Router();

router.post('/analyze', async (req, res) => {
  const { site, goal, scenarioYears, analysisId } = req.body;

  if (!site || !goal || !goal.description) {
    return res.status(400).json({ error: 'site and goal.description are required' });
  }

  try {
    const result = await runAnalysis({ site, goal, scenarioYears, analysisId });
    res.json(result);
  } catch (err) {
    console.error('Analysis failed, returning mock:', err.message);
    res.json(mockData);
  }
});

module.exports = router;
