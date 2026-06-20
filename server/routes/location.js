const { Router } = require('express');
const {
  autocomplete,
  getPlaceDetails,
  getStreetViewStatus,
  fetchStreetViewImage,
  fetchSatelliteImage,
} = require('../services/googleMapsService');

const router = Router();

router.get('/location/autocomplete', async (req, res) => {
  const { input } = req.query;
  if (!input || !input.trim()) {
    return res.status(400).json({ error: 'input is required' });
  }
  try {
    const suggestions = await autocomplete(input);
    res.json({ suggestions });
  } catch (err) {
    res.status(503).json({ error: err.message });
  }
});

router.get('/location/details', async (req, res) => {
  const { placeId } = req.query;
  if (!placeId) {
    return res.status(400).json({ error: 'placeId is required' });
  }
  try {
    const location = await getPlaceDetails(placeId);
    res.json(location);
  } catch (err) {
    res.status(503).json({ error: err.message });
  }
});

router.get('/location/street-view-status', async (req, res) => {
  const { lat, lon } = req.query;
  if (!lat || !lon) {
    return res.status(400).json({ error: 'lat and lon are required' });
  }
  try {
    const status = await getStreetViewStatus(lat, lon);
    res.json(status);
  } catch (err) {
    res.status(503).json({ error: err.message });
  }
});

// Image proxies: the Google API key never appears in any URL sent to the browser.
router.get('/location/street-view-image', async (req, res) => {
  const { lat, lon, heading, pitch, fov } = req.query;
  if (!lat || !lon) {
    return res.status(400).json({ error: 'lat and lon are required' });
  }
  try {
    const { buffer, contentType } = await fetchStreetViewImage({
      lat, lon,
      heading: heading ? Number(heading) : undefined,
      pitch: pitch ? Number(pitch) : undefined,
      fov: fov ? Number(fov) : undefined,
    });
    res.set('Content-Type', contentType);
    res.send(buffer);
  } catch (err) {
    res.status(503).json({ error: err.message });
  }
});

router.get('/location/satellite-image', async (req, res) => {
  const { lat, lon, zoom } = req.query;
  if (!lat || !lon) {
    return res.status(400).json({ error: 'lat and lon are required' });
  }
  try {
    const { buffer, contentType } = await fetchSatelliteImage({
      lat, lon,
      zoom: zoom ? Number(zoom) : undefined,
    });
    res.set('Content-Type', contentType);
    res.send(buffer);
  } catch (err) {
    res.status(503).json({ error: err.message });
  }
});

module.exports = router;
