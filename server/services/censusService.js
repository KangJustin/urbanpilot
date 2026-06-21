// U.S. Census Bureau: Geocoder → block group → ACS 5-Year housing/demographic metrics.
const GEOCODER_BASE = 'https://geocoding.geo.census.gov/geocoder/geographies/coordinates';
const ACS_YEARS = ['2024', '2023'];
const ACS_SOURCE_LABEL = 'ACS 2024 5-Year';

// ACS 5-Year variable codes (subject table)
const ACS_VARS = {
  population: 'B01003_001E',
  medianIncome: 'B19013_001E',
  povertyTotal: 'B17001_001E',
  povertyBelow: 'B17001_002E',
  medianRent: 'B25064_001E',
  medianHomeValue: 'B25077_001E',
  housingUnits: 'B25001_001E',
  vacantUnits: 'B25002_003E',
  occupiedUnits: 'B25003_001E',
  renterOccupied: 'B25003_003E',
};

const VAR_LIST = Object.values(ACS_VARS);

function requireApiKey() {
  const key = process.env.CENSUS_API_KEY;
  if (!key) throw new Error('CENSUS_API_KEY is not configured');
  return key;
}

function parseAcsCount(value) {
  if (value == null || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n);
}

function parseAcsDollars(value) {
  const n = parseAcsCount(value);
  return n;
}

function pct(numerator, denominator) {
  if (numerator == null || denominator == null || denominator === 0) return null;
  return Math.round((numerator / denominator) * 1000) / 10;
}

function geocoderUrl(longitude, latitude) {
  const params = new URLSearchParams({
    x: String(longitude),
    y: String(latitude),
    benchmark: 'Public_AR_Current',
    vintage: 'Current_Current',
    format: 'json',
  });
  return `${GEOCODER_BASE}?${params.toString()}`;
}

function acsUrl(year, geography, apiKey) {
  const get = ['NAME', ...VAR_LIST].join(',');
  const params = new URLSearchParams({
    get,
    for: `block group:${geography.blockGroup}`,
    in: `state:${geography.state}+county:${geography.county}+tract:${geography.tract}`,
    key: apiKey,
  });
  return `https://api.census.gov/data/${year}/acs/acs5?${params.toString()}`;
}

async function geocodeToBlockGroup(latitude, longitude) {
  const url = geocoderUrl(longitude, latitude);
  console.log('[census] Geocoder URL:', url);

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Census Geocoder error (${res.status})`);
  const data = await res.json();

  const blockGroup =
    data?.result?.geographies?.['Census Block Groups']?.[0]
    || data?.result?.geographies?.['2020 Census Blocks']?.[0];

  if (!blockGroup) {
    throw new Error('Census Geocoder did not return a block group for these coordinates');
  }

  const geography = {
    state: blockGroup.STATE,
    county: blockGroup.COUNTY,
    tract: blockGroup.TRACT,
    blockGroup: blockGroup.BLKGRP,
    geoid: blockGroup.GEOID,
    name: blockGroup.NAMELSAD || blockGroup.NAME,
  };

  console.log('[census] Geography:', {
    state: geography.state,
    county: geography.county,
    tract: geography.tract,
    blockGroup: geography.blockGroup,
    geoid: geography.geoid,
    name: geography.name,
  });

  return geography;
}

function normalizeAcsRow(headers, row) {
  const record = {};
  headers.forEach((header, i) => {
    record[header] = row[i];
  });

  const population = parseAcsCount(record[ACS_VARS.population]);
  const medianIncome = parseAcsDollars(record[ACS_VARS.medianIncome]);
  const medianRent = parseAcsDollars(record[ACS_VARS.medianRent]);
  const medianHomeValue = parseAcsDollars(record[ACS_VARS.medianHomeValue]);
  const housingUnits = parseAcsCount(record[ACS_VARS.housingUnits]);
  const povertyTotal = parseAcsCount(record[ACS_VARS.povertyTotal]);
  const povertyBelow = parseAcsCount(record[ACS_VARS.povertyBelow]);
  const vacantUnits = parseAcsCount(record[ACS_VARS.vacantUnits]);
  const occupiedUnits = parseAcsCount(record[ACS_VARS.occupiedUnits]);
  const renterOccupied = parseAcsCount(record[ACS_VARS.renterOccupied]);

  return {
    population,
    medianIncome,
    medianRent,
    medianHomeValue,
    povertyRate: pct(povertyBelow, povertyTotal),
    renterPercent: pct(renterOccupied, occupiedUnits),
    vacancyRate: pct(vacantUnits, housingUnits),
    housingUnits,
    source: ACS_SOURCE_LABEL,
    verified: true,
    geographyName: record.NAME || null,
    acsVariables: ACS_VARS,
  };
}

async function fetchAcsForGeography(geography, apiKey) {
  let lastError;
  for (const year of ACS_YEARS) {
    const url = acsUrl(year, geography, apiKey);
    console.log('[census] ACS URL:', url.replace(apiKey, '***'));

    try {
      const res = await fetch(url);
      if (!res.ok) {
        lastError = new Error(`ACS API error (${res.status}) for year ${year}`);
        continue;
      }
      const rows = await res.json();
      if (!Array.isArray(rows) || rows.length < 2) {
        lastError = new Error(`ACS API returned no data for year ${year}`);
        continue;
      }

      const [headers, values] = rows;
      const normalized = normalizeAcsRow(headers, values);
      if (year !== '2024') {
        console.warn(`[census] Using ACS ${year} 5-Year (2024 dataset unavailable)`);
        normalized.source = `ACS ${year} 5-Year`;
      }

      console.log('[census] Normalized ACS response:', JSON.stringify(normalized, null, 2));
      return {
        ...normalized,
        geography,
        datasetYear: year,
      };
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError || new Error('ACS lookup failed');
}

async function getHousingMetrics(latitude, longitude) {
  const apiKey = requireApiKey();
  const geography = await geocodeToBlockGroup(latitude, longitude);
  return fetchAcsForGeography(geography, apiKey);
}

module.exports = {
  getHousingMetrics,
  geocodeToBlockGroup,
  geocoderUrl,
  acsUrl,
  ACS_VARS,
  ACS_SOURCE_LABEL,
};
