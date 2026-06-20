const { Router } = require('express');
const { answerQuestion } = require('../agents/ask');

const router = Router();

router.post('/ask', async (req, res) => {
  const { question, site, data } = req.body;

  if (!question) {
    return res.status(400).json({ error: 'question is required' });
  }

  try {
    const answer = await answerQuestion({ question, site, data });
    res.json({ answer });
  } catch (err) {
    res.status(503).json({ error: err.message });
  }
});

module.exports = router;
