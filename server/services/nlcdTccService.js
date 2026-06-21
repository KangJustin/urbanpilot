// NLCD Tree Canopy Cover 2023 — USFS/MRLC ArcGIS ImageServer point identify (no API key).

const IMAGE_SERVER = 'https://imagery.geoplatform.gov/iipp/rest/services/Vegetation/USFS_EDW_NLCD_TCC_CONUS/ImageServer';
const TCC_YEAR = 2023;
const RESOLUTION_M = 30;
const SOURCE = 'NLCD Tree Canopy Cover 2023 (USFS/MRLC)';

// Approximate CONUS coverage for the USFS_EDW_NLCD_TCC_CONUS ImageServer.
const CONUS_BOUNDS = {
  minLat: 24.0,
  maxLat: 50.0,
  minLon: -125.0,
  maxLon: -66.0,
};

const MOSAIC_RULE = JSON.stringify({
  mosaicMethod: 'esriMosaicAttribute',
  where: `endyear=${TCC_YEAR}`,
  ascending: true,
  mosaicOperation: 'MT_FIRST',
});

const RENDERING_RULE = JSON.stringify({
  rasterFunction: 'NLCDTCC_noBkgrd',
});

function isInConus(latitude, longitude) {
  return (
    latitude >= CONUS_BOUNDS.minLat
    && latitude <= CONUS_BOUNDS.maxLat
    && longitude >= CONUS_BOUNDS.minLon
    && longitude <= CONUS_BOUNDS.maxLon
  );
}

function buildNlcdQueryUrl(latitude, longitude) {
  const geometry = JSON.stringify({
    x: longitude,
    y: latitude,
    spatialReference: { wkid: 4326 },
  });

  const params = new URLSearchParams({
    geometry,
    geometryType: 'esriGeometryPoint',
    mosaicRule: MOSAIC_RULE,
    renderingRule: RENDERING_RULE,
    returnGeometry: 'false',
    f: 'json',
  });

  return `${IMAGE_SERVER}/identify?${params.toString()}`;
}

function normalizeTreeCanopyPercent(rawValue) {
  if (rawValue == null || rawValue === '' || rawValue === 'NoData') {
    return null;
  }

  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed)) return null;
  if (parsed === 254 || parsed === 255) return null;
  if (parsed < 0 || parsed > 100) return null;

  return Math.round(parsed);
}

async function getNlcdTreeCanopyMetrics(latitude, longitude) {
  if (latitude == null || longitude == null) {
    return { nlcdAvailable: false, nlcdData: null };
  }

  if (!isInConus(latitude, longitude)) {
    console.log('[nlcd] Coordinates outside CONUS NLCD TCC coverage');
    return { nlcdAvailable: false, nlcdData: null };
  }

  const queryUrl = buildNlcdQueryUrl(latitude, longitude);
  console.log('[nlcd] TCC identify URL:', queryUrl);

  const response = await fetch(queryUrl);
  if (!response.ok) {
    throw new Error(`NLCD TCC ImageServer error (${response.status})`);
  }

  const payload = await response.json();
  if (payload.error) {
    throw new Error(payload.error.message || 'NLCD TCC identify failed');
  }

  const rawValue = payload.value ?? payload.properties?.Values?.[0] ?? null;
  const treeCanopyPercent = normalizeTreeCanopyPercent(rawValue);

  if (treeCanopyPercent == null) {
    console.log('[nlcd] No valid tree canopy value for coordinates (raw:', rawValue, ')');
    return { nlcdAvailable: false, nlcdData: null };
  }

  const nlcdData = {
    treeCanopyPercent,
    year: TCC_YEAR,
    resolutionM: RESOLUTION_M,
    source: SOURCE,
    verified: true,
  };

  console.log('[nlcd] Normalized NLCD data:', JSON.stringify(nlcdData, null, 2));

  return { nlcdAvailable: true, nlcdData };
}

module.exports = {
  getNlcdTreeCanopyMetrics,
  buildNlcdQueryUrl,
  normalizeTreeCanopyPercent,
  isInConus,
  SOURCE,
  TCC_YEAR,
  RESOLUTION_M,
};
