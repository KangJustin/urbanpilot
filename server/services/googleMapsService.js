// Server-side wrapper around Google Maps Platform APIs. Uses GOOGLE_MAPS_SERVER_API_KEY,
// which must never be shipped to the browser (it has no HTTP-referrer restriction, only an
// API restriction, so it stays server-only by design).
const PLACES_BASE = 'https://places.googleapis.com/v1';
const GEOCODE_BASE = 'https://maps.googleapis.com/maps/api/geocode/json';
const STREETVIEW_METADATA_BASE = 'https://maps.googleapis.com/maps/api/streetview/metadata';
const STREETVIEW_IMAGE_BASE = 'https://maps.googleapis.com/maps/api/streetview';
const STATIC_MAP_BASE = 'https://maps.googleapis.com/maps/api/staticmap';

function requireKey() {
  const key = process.env.GOOGLE_MAPS_SERVER_API_KEY;
  if (!key) throw new Error('GOOGLE_MAPS_SERVER_API_KEY is not configured');
  return key;
}

async function autocomplete(input) {
  const key = requireKey();
  const res = await fetch(`${PLACES_BASE}/places:autocomplete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': key,
    },
    body: JSON.stringify({ input }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Places autocomplete error (${res.status}): ${body}`);
  }
  const data = await res.json();
  return (data.suggestions || [])
    .filter(s => s.placePrediction)
    .map(s => ({
      placeId: s.placePrediction.placeId,
      text: s.placePrediction.text?.text,
      mainText: s.placePrediction.structuredFormat?.mainText?.text,
      secondaryText: s.placePrediction.structuredFormat?.secondaryText?.text,
    }));
}

function mapViewport(viewport) {
  if (!viewport?.low || !viewport?.high) return undefined;
  return {
    south: viewport.low.latitude,
    west: viewport.low.longitude,
    north: viewport.high.latitude,
    east: viewport.high.longitude,
  };
}

async function geocodeFallback(placeId) {
  const key = requireKey();
  const res = await fetch(`${GEOCODE_BASE}?place_id=${encodeURIComponent(placeId)}&key=${key}`);
  if (!res.ok) throw new Error(`Geocoding error (${res.status})`);
  const data = await res.json();
  const result = data.results?.[0];
  if (data.status !== 'OK' || !result) {
    throw new Error(`Geocoding could not resolve placeId (status: ${data.status})`);
  }
  return {
    formattedAddress: result.formatted_address,
    latitude: result.geometry.location.lat,
    longitude: result.geometry.location.lng,
  };
}

async function getPlaceDetails(placeId) {
  const key = requireKey();
  const res = await fetch(`${PLACES_BASE}/places/${encodeURIComponent(placeId)}`, {
    headers: {
      'X-Goog-Api-Key': key,
      'X-Goog-FieldMask': 'id,displayName,formattedAddress,location,viewport',
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Place details error (${res.status}): ${body}`);
  }
  const place = await res.json();

  let latitude = place.location?.latitude;
  let longitude = place.location?.longitude;
  let formattedAddress = place.formattedAddress;

  // Place Details (New) should always include location for a real place; this fallback only
  // triggers in the rare case it doesn't, per the "don't make an unnecessary Geocoding request" rule.
  if (latitude == null || longitude == null || !formattedAddress) {
    const fallback = await geocodeFallback(placeId);
    latitude = latitude ?? fallback.latitude;
    longitude = longitude ?? fallback.longitude;
    formattedAddress = formattedAddress || fallback.formattedAddress;
  }

  if (latitude == null || longitude == null || !formattedAddress) {
    throw new Error('The selected place does not contain valid location data.');
  }

  return {
    placeId: place.id || placeId,
    displayName: place.displayName?.text,
    formattedAddress,
    latitude,
    longitude,
    viewport: mapViewport(place.viewport),
  };
}

async function getStreetViewStatus(lat, lon) {
  const key = requireKey();
  const res = await fetch(
    `${STREETVIEW_METADATA_BASE}?location=${lat},${lon}&key=${key}`
  );
  if (!res.ok) throw new Error(`Street View metadata error (${res.status})`);
  const data = await res.json();
  return { available: data.status === 'OK', status: data.status };
}

// Returns {buffer, contentType} so the route can proxy the bytes back to the browser —
// the API key must never appear in a URL the client sees (img src, redirect Location, etc).
async function fetchStreetViewImage({ lat, lon, heading = 0, pitch = 0, fov = 90, width = 640, height = 400 }) {
  const key = requireKey();
  const params = new URLSearchParams({
    location: `${lat},${lon}`,
    heading: String(heading),
    pitch: String(pitch),
    fov: String(fov),
    size: `${width}x${height}`,
    key,
  });
  const res = await fetch(`${STREETVIEW_IMAGE_BASE}?${params.toString()}`);
  if (!res.ok) throw new Error(`Street View image error (${res.status})`);
  return { buffer: Buffer.from(await res.arrayBuffer()), contentType: res.headers.get('content-type') || 'image/jpeg' };
}

async function fetchSatelliteImage({ lat, lon, zoom = 18, width = 640, height = 400 }) {
  const key = requireKey();
  const params = new URLSearchParams({
    center: `${lat},${lon}`,
    zoom: String(zoom),
    size: `${width}x${height}`,
    maptype: 'satellite',
    key,
  });
  const res = await fetch(`${STATIC_MAP_BASE}?${params.toString()}`);
  if (!res.ok) throw new Error(`Static satellite image error (${res.status})`);
  return { buffer: Buffer.from(await res.arrayBuffer()), contentType: res.headers.get('content-type') || 'image/png' };
}

module.exports = {
  autocomplete,
  getPlaceDetails,
  getStreetViewStatus,
  fetchStreetViewImage,
  fetchSatelliteImage,
};
