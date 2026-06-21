// 511 SF Bay Regional GTFS → verified transit proximity metrics for the Accessibility Agent.
const AdmZip = require('adm-zip');
const fs = require('fs');
const path = require('path');
const os = require('os');

const GTFS_FEED_URL = 'http://api.511.org/transit/datafeeds';
const SOURCE_LABEL = '511 SF Bay Regional GTFS';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

// Approximate MTC 511 SF Bay service area (reject early outside region).
const BAY_AREA_BOUNDS = {
  minLat: 36.85,
  maxLat: 38.85,
  minLon: -123.05,
  maxLon: -121.15,
};

const ROUTE_TYPE_MODE = {
  0: 'tram',
  1: 'metro',
  2: 'rail',
  3: 'bus',
  4: 'ferry',
  5: 'cable_car',
  6: 'gondola',
  7: 'funicular',
};

let gtfsCache = null;
let gtfsLoadPromise = null;

function requireApiKey() {
  const key = process.env.TRANSIT_511_API_KEY;
  if (!key) throw new Error('TRANSIT_511_API_KEY is not configured');
  return key;
}

function isInBayArea(latitude, longitude) {
  return (
    latitude >= BAY_AREA_BOUNDS.minLat
    && latitude <= BAY_AREA_BOUNDS.maxLat
    && longitude >= BAY_AREA_BOUNDS.minLon
    && longitude <= BAY_AREA_BOUNDS.maxLon
  );
}

function haversineMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        field += '"';
        i += 1;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || (ch === '\r' && next === '\n')) {
      row.push(field);
      if (row.length > 1 || row[0] !== '') rows.push(row);
      row = [];
      field = '';
      if (ch === '\r') i += 1;
    } else if (ch !== '\r') {
      field += ch;
    }
  }

  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }

  if (!rows.length) return [];

  const headers = rows[0].map((h) => h.trim());
  return rows.slice(1).map((cells) => {
    const obj = {};
    headers.forEach((header, idx) => {
      obj[header] = (cells[idx] ?? '').trim();
    });
    return obj;
  });
}

function readZipEntry(zip, name) {
  const entry = zip.getEntry(name);
  if (!entry) return null;
  return zip.readAsText(entry, 'utf8');
}

function buildStopRouteIndex(stopTimesText, tripRouteMap) {
  const stopRoutes = new Map();
  const lines = stopTimesText.split('\n');
  if (!lines.length) return stopRoutes;

  const headers = lines[0].replace(/^\uFEFF/, '').split(',').map((h) => h.trim());
  const tripIdx = headers.indexOf('trip_id');
  const stopIdx = headers.indexOf('stop_id');
  if (tripIdx === -1 || stopIdx === -1) return stopRoutes;

  for (let i = 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line.trim()) continue;
    const cols = line.split(',');
    const tripId = cols[tripIdx]?.trim();
    const stopId = cols[stopIdx]?.trim();
    if (!tripId || !stopId) continue;
    const routeId = tripRouteMap.get(tripId);
    if (!routeId) continue;
    if (!stopRoutes.has(stopId)) stopRoutes.set(stopId, new Set());
    stopRoutes.get(stopId).add(routeId);
  }

  return stopRoutes;
}

function parseGtfsZip(buffer) {
  const zip = new AdmZip(buffer);
  const stopsText = readZipEntry(zip, 'stops.txt');
  const routesText = readZipEntry(zip, 'routes.txt');
  const tripsText = readZipEntry(zip, 'trips.txt');
  const stopTimesText = readZipEntry(zip, 'stop_times.txt');

  if (!stopsText || !routesText || !tripsText || !stopTimesText) {
    throw new Error('Regional GTFS zip is missing required files (stops, routes, trips, stop_times)');
  }

  const routeRows = parseCsv(routesText);
  const tripRows = parseCsv(tripsText);
  const stopRows = parseCsv(stopsText);

  const routes = new Map();
  for (const row of routeRows) {
    if (!row.route_id) continue;
    routes.set(row.route_id, {
      routeId: row.route_id,
      agencyId: row.agency_id || row.route_id.split(':')[0] || 'unknown',
      routeType: row.route_type != null ? Number(row.route_type) : null,
      shortName: row.route_short_name || '',
      longName: row.route_long_name || '',
    });
  }

  const tripRouteMap = new Map();
  for (const row of tripRows) {
    if (row.trip_id && row.route_id) tripRouteMap.set(row.trip_id, row.route_id);
  }

  const stopRouteIndex = buildStopRouteIndex(stopTimesText, tripRouteMap);

  const stops = [];
  for (const row of stopRows) {
    const lat = Number(row.stop_lat);
    const lon = Number(row.stop_lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    const locationType = row.location_type != null ? Number(row.location_type) : 0;
    stops.push({
      stopId: row.stop_id,
      name: row.stop_name || row.stop_id,
      latitude: lat,
      longitude: lon,
      locationType,
      parentStation: row.parent_station || null,
    });
  }

  console.log(`[transit511] Loaded ${stops.length} stops, ${routes.size} routes from regional GTFS`);
  return { stops, routes, stopRouteIndex, loadedAt: Date.now() };
}

async function downloadRegionalGtfs() {
  const apiKey = requireApiKey();
  const url = `${GTFS_FEED_URL}?api_key=${encodeURIComponent(apiKey)}&operator_id=RG`;
  console.log('[transit511] Downloading regional GTFS (operator_id=RG)...');

  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`511 GTFS download failed (${res.status}): ${body.slice(0, 200)}`);
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  const cachePath = path.join(os.tmpdir(), 'urbanpilot-511-rg-gtfs.zip');
  fs.writeFileSync(cachePath, buffer);
  console.log(`[transit511] GTFS zip saved (${(buffer.length / 1024 / 1024).toFixed(1)} MB)`);

  return parseGtfsZip(buffer);
}

async function ensureGtfsLoaded() {
  if (gtfsCache && Date.now() - gtfsCache.loadedAt < CACHE_TTL_MS) {
    return gtfsCache;
  }

  if (!gtfsLoadPromise) {
    gtfsLoadPromise = downloadRegionalGtfs()
      .then((data) => {
        gtfsCache = data;
        gtfsLoadPromise = null;
        return data;
      })
      .catch((err) => {
        gtfsLoadPromise = null;
        throw err;
      });
  }

  return gtfsLoadPromise;
}

function modeFromRouteType(routeType) {
  if (routeType == null || Number.isNaN(routeType)) return 'unknown';
  return ROUTE_TYPE_MODE[routeType] || `type_${routeType}`;
}

function computeMetrics(latitude, longitude, gtfs) {
  const within400 = [];
  const within800 = [];

  for (const stop of gtfs.stops) {
    const distanceM = Math.round(haversineMeters(latitude, longitude, stop.latitude, stop.longitude));
    if (distanceM <= 800) {
      within800.push({ ...stop, distanceM });
      if (distanceM <= 400) within400.push({ ...stop, distanceM });
    }
  }

  within400.sort((a, b) => a.distanceM - b.distanceM);
  within800.sort((a, b) => a.distanceM - b.distanceM);

  const routeIds800 = new Set();
  const operators800 = new Set();
  const modes800 = new Set();

  for (const stop of within800) {
    const routesAtStop = gtfs.stopRouteIndex.get(stop.stopId);
    if (!routesAtStop) continue;
    for (const routeId of routesAtStop) {
      routeIds800.add(routeId);
      const route = gtfs.routes.get(routeId);
      if (!route) continue;
      operators800.add(route.agencyId);
      modes800.add(modeFromRouteType(route.routeType));
    }
  }

  const hubs800 = within800.filter((s) => s.locationType === 1);
  const nearestHubStop = hubs800[0] || null;

  const nearestStop = within800[0] || null;
  const nearestHub = nearestHubStop
    ? {
      name: nearestHubStop.name,
      distanceM: nearestHubStop.distanceM,
      stopId: nearestHubStop.stopId,
      locationType: nearestHubStop.locationType,
    }
    : {};

  return {
    nearbyStops400m: within400.length,
    nearbyStops800m: within800.length,
    uniqueRoutes800m: routeIds800.size,
    operators800m: [...operators800].sort(),
    modes800m: [...modes800].sort(),
    nearestStopM: nearestStop ? nearestStop.distanceM : 0,
    nearestHub,
    nearestStops: within800.slice(0, 5).map((s) => ({
      stopId: s.stopId,
      name: s.name,
      distanceM: s.distanceM,
      locationType: s.locationType,
    })),
  };
}

function emptyTransitResult() {
  return { transitAvailable: false, transitData: null };
}

async function getTransitMetrics(latitude, longitude) {
  if (latitude == null || longitude == null) return emptyTransitResult();

  if (!isInBayArea(latitude, longitude)) {
    console.log('[transit511] Coordinates outside SF Bay 511 coverage — skipping GTFS lookup');
    return emptyTransitResult();
  }

  try {
    const gtfs = await ensureGtfsLoaded();
    const metrics = computeMetrics(latitude, longitude, gtfs);

    return {
      transitAvailable: true,
      transitData: {
        ...metrics,
        source: SOURCE_LABEL,
        verified: true,
        geography: { region: 'SF Bay Area', operatorFeed: 'RG' },
      },
    };
  } catch (err) {
    console.warn('[transit511] GTFS lookup failed:', err.message);
    return emptyTransitResult();
  }
}

module.exports = {
  getTransitMetrics,
  isInBayArea,
  haversineMeters,
  SOURCE_LABEL,
  BAY_AREA_BOUNDS,
};
