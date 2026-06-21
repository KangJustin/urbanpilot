require('dotenv').config();
const express = require('express');
const cors = require('cors');
const healthRouter = require('./routes/health');
const analysisRouter = require('./routes/analysis');
const visualizeRouter = require('./routes/visualize');
const conditionsRouter = require('./routes/conditions');
const askRouter = require('./routes/ask');
const locationRouter = require('./routes/location');
const uploadRouter = require('./routes/upload');

const app = express();
const PORT = process.env.PORT || 3001;

const allowedOrigins = ['http://localhost:3000', ...(process.env.ALLOWED_ORIGINS?.split(',') || [])];
app.use(cors({ origin: allowedOrigins }));
app.use(express.json());
app.use('/uploads', express.static(require('path').join(__dirname, 'uploads')));

app.use('/api', healthRouter);
app.use('/api', analysisRouter);
app.use('/api', visualizeRouter);
app.use('/api', conditionsRouter);
app.use('/api', askRouter);
app.use('/api', locationRouter);
app.use('/api', uploadRouter);

app.listen(PORT, () => {
  console.log(`UrbanPilot server running on http://localhost:${PORT}`);
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('Warning: ANTHROPIC_API_KEY not set — agents will fall back to mock data');
  }
  if (!process.env.GOOGLE_MAPS_SERVER_API_KEY) {
    console.warn('Warning: GOOGLE_MAPS_SERVER_API_KEY not set — location search and present-day view will be unavailable');
  }
  if (!process.env.CENSUS_API_KEY) {
    console.warn('Warning: CENSUS_API_KEY not set — Housing Agent will run without verified ACS data');
  }
});
