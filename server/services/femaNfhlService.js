// FEMA National Flood Hazard Layer (NFHL) — point-in-polygon flood zone lookup (no API key).

const NFHL_BASE = 'https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer';
const FLOOD_ZONES_LAYER = 28;
const SOURCE = 'FEMA National Flood Hazard Layer';

const SFHA_ZONES = new Set(['A', 'AE', 'AH', 'AO', 'AR', 'A99', 'V', 'VE']);

function buildFemaQueryUrl(latitude, longitude) {
  const params = new URLSearchParams({
    where: '1=1',
    geometry: `${longitude},${latitude}`,
    geometryType: 'esriGeometryPoint',
    inSR: '4326',
    spatialRel: 'esriSpatialRelIntersects',
    outFields: 'FLD_ZONE,ZONE_SUBTY,SFHA_TF,STATIC_BFE',
    returnGeometry: 'false',
    f: 'json',
  });
  return `${NFHL_BASE}/${FLOOD_ZONES_LAYER}/query?${params.toString()}`;
}

function normalizeBaseFloodElevation(staticBfe) {
  if (staticBfe == null || staticBfe === -9999 || staticBfe < 0) return null;
  return staticBfe;
}

function floodRiskFromZone(fldZone, sfhaTf, zoneSubty) {
  const zone = (fldZone || '').toUpperCase().trim();
  const inSfha = sfhaTf === 'T';
  const subty = (zoneSubty || '').toUpperCase();

  if (zone.startsWith('V') || (SFHA_ZONES.has(zone) && inSfha)) {
    return zone.startsWith('V') ? 'High (Coastal)' : 'High';
  }
  if (inSfha || SFHA_ZONES.has(zone)) {
    return 'High';
  }
  if (
    zone === 'X'
    && (subty.includes('0.2 PCT') || subty.includes('500') || subty.includes('MODERATE'))
  ) {
    return 'Moderate';
  }
  if (zone === 'D') return 'Undetermined';
  return 'Minimal';
}

function normalizeFemaFeature(attributes) {
  const floodZone = attributes?.FLD_ZONE ?? null;
  const sfhaTf = attributes?.SFHA_TF ?? null;
  const zoneSubty = attributes?.ZONE_SUBTY ?? null;
  const inSpecialFloodHazardArea = sfhaTf === 'T';

  return {
    floodZone,
    floodRisk: floodRiskFromZone(floodZone, sfhaTf, zoneSubty),
    inSpecialFloodHazardArea,
    baseFloodElevationFt: normalizeBaseFloodElevation(attributes?.STATIC_BFE),
    zoneSubtype: zoneSubty || null,
    source: SOURCE,
    verified: true,
  };
}

async function getFemaFloodMetrics(latitude, longitude) {
  if (latitude == null || longitude == null) {
    return { femaAvailable: false, femaData: null };
  }

  const queryUrl = buildFemaQueryUrl(latitude, longitude);
  console.log('[fema] NFHL query URL:', queryUrl);

  const response = await fetch(queryUrl);
  if (!response.ok) {
    throw new Error(`FEMA NFHL API error (${response.status})`);
  }

  const payload = await response.json();
  if (payload.error) {
    throw new Error(payload.error.message || 'FEMA NFHL query failed');
  }

  const feature = payload.features?.[0];
  if (!feature?.attributes?.FLD_ZONE) {
    console.log('[fema] No flood zone polygon found for coordinates');
    return { femaAvailable: false, femaData: null };
  }

  const femaData = normalizeFemaFeature(feature.attributes);
  console.log('[fema] Normalized FEMA data:', JSON.stringify(femaData, null, 2));

  return { femaAvailable: true, femaData };
}

module.exports = {
  getFemaFloodMetrics,
  buildFemaQueryUrl,
  floodRiskFromZone,
  normalizeFemaFeature,
  SOURCE,
};
