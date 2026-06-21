const { callAgent } = require('../services/claudeService');

const SYSTEM = `You are an urban futurist, scenario planner, and architectural visualization director. \
Given a set of urban planning interventions and verified baseline metrics, you generate vivid multi-decade \
future scenarios AND professional Midjourney visualization prompts. \
When verified ACS, GTFS, Open-Meteo, FEMA, or NLCD baseline data is provided, you MUST use those exact values \
for 2026 baseline conditions in descriptions, projectedChanges, and 2026 visualizationPrompts. \
Do NOT contradict verified ACS, GTFS, FEMA, or NLCD data. \
2040 and 2075 scenarios are projections — use verified baselines as the "before" values in before → after metrics. \
Clearly distinguish verified baseline (2026) from projected future conditions (2040/2075). \
Be specific about measurable changes. Avoid vague language. \
Return ONLY a valid JSON object. No explanation, no markdown, no other text.`;

function fmtUsd(n) {
  return n == null ? 'N/A' : `$${n.toLocaleString('en-US')}`;
}

function formatVerifiedBaselines(housing, accessibility, climate) {
  const lines = ['Verified baselines:'];
  let hasAny = false;

  const census = housing?.censusAvailable && housing?.censusData ? housing.censusData : null;
  if (census) {
    hasAny = true;
    lines.push('', `Housing (${census.source || 'ACS'}):`);
    lines.push(`- Median income: ${fmtUsd(census.medianIncome)}`);
    lines.push(`- Median rent: ${fmtUsd(census.medianRent)}`);
    lines.push(`- Renter %: ${census.renterPercent == null ? 'N/A' : `${census.renterPercent}%`}`);
    lines.push(`- Vacancy rate: ${census.vacancyRate == null ? 'N/A' : `${census.vacancyRate}%`}`);
  }

  const transit = accessibility?.transitAvailable && accessibility?.transitData
    ? accessibility.transitData
    : null;
  if (transit) {
    hasAny = true;
    const hub = transit.nearestHub?.name
      ? `${transit.nearestHub.name} (${transit.nearestHub.distanceM}m)`
      : 'none within 800m';
    lines.push('', `Accessibility (${transit.source || '511 SF Bay Regional GTFS'}):`);
    lines.push(`- Transit stops within 400m: ${transit.nearbyStops400m ?? 'N/A'}`);
    lines.push(`- Transit stops within 800m: ${transit.nearbyStops800m ?? 'N/A'}`);
    lines.push(`- Route count within 800m: ${transit.uniqueRoutes800m ?? 'N/A'}`);
    lines.push(`- Nearest transit hub: ${hub}`);
  }

  const c = climate?.climateAvailable && climate?.climateData ? climate.climateData : null;
  if (c) {
    hasAny = true;
    lines.push('', 'Climate:');
    if (c.temperatureF != null) {
      lines.push(`- Temperature: ${Math.round(c.temperatureF)}°F${c.weatherDescription ? ` (${c.weatherDescription})` : ''}`);
    }
    if (c.usAqi != null) {
      lines.push(`- AQI: ${c.usAqi}${c.aqiCategory ? ` (${c.aqiCategory})` : ''}`);
    }
    if (c.femaFloodZone != null) {
      lines.push(`- FEMA flood zone: ${c.femaFloodZone}`);
      lines.push(`- FEMA flood risk: ${c.femaFloodRisk ?? 'N/A'}`);
    }
    if (c.treeCanopyPercent != null) {
      lines.push(`- NLCD tree canopy: ${c.treeCanopyPercent}% (${c.treeCanopyYear || 2023}, ${c.treeCanopyResolutionM || 30}m pixel)`);
    }
  }

  if (!hasAny) {
    return 'Verified baselines: No verified ACS, GTFS, or climate baseline data available — label 2026 metrics as estimates.';
  }

  return lines.join('\n');
}

function scenarioSchema(year, label, intensity, isBaseline) {
  const projectedChangesHint = isBaseline
    ? `[
      "<verified baseline metric, e.g. Tree canopy: 0% (NLCD 2023)>",
      "<verified baseline metric, e.g. Transit stops within 800m: 66>",
      "<verified baseline metric, e.g. FEMA flood zone: X>",
      "<verified baseline metric, e.g. Median rent: $1,719 (ACS)>"
    ]`
    : `[
      "<metric: verified baseline → projected future, e.g. Tree canopy: 0% → 25%>",
      "<metric: verified baseline → projected future>",
      "<metric: verified baseline → projected future>"
    ]`;

  const vizHint = isBaseline
    ? 'Describe current site conditions using verified baseline context (e.g. sparse canopy if NLCD is low, BART proximity if nearest hub is BART, minimal flood exposure if FEMA zone X). Documentary present-day realism'
    : 'Show projected improvements scaled to this time horizon';

  return `  "${year}": {
    "title": "<compelling ${year} scenario title>",
    "description": "<2-3 sentence vivid narrative in present tense, as if it is ${year}${isBaseline ? '; cite verified baseline metrics where provided' : '; projections only, anchored to verified 2026 baselines'}>",
    "climateScore": <0-100 integer, ${intensity}>,
    "accessibilityScore": <0-100 integer, ${intensity}>,
    "housingScore": <0-100 integer, ${intensity}>,
    "projectedChanges": ${projectedChangesHint},
    "visualizationPrompt": "Create a realistic architectural visualization of <site> in ${year}, ${label}. ${vizHint}. <3-4 specific visual elements drawn from the recommendations>. Professional urban planning rendering, architectural competition visualization, highly realistic, climate-tech future, detailed environmental design, cinematic golden hour daylight --ar 16:9 --v 7 --stylize ${isBaseline ? 100 : 250}"
  }`;
}

function buildVisionPrompt({ site, goal }, { urbanDesign, climate, accessibility, housing }) {
  const verifiedBaselines = formatVerifiedBaselines(housing, accessibility, climate);
  const immediate = urbanDesign?.strategy?.immediate || [];
  const mediumTerm = urbanDesign?.strategy?.medium_term || [];
  const longTerm = urbanDesign?.strategy?.long_term || [];

  return `Generate three future scenarios (2026, 2040, 2075) and visualization prompts for this site.

Site: ${site.name}
Goal: ${goal.description}
Urban design strategy: ${urbanDesign?.summary || 'Not available'}

Immediate actions: ${immediate.join('; ') || 'none'}
Medium-term actions: ${mediumTerm.join('; ') || 'none'}
Long-term actions: ${longTerm.join('; ') || 'none'}

${verifiedBaselines}

Climate agent summary: ${climate?.summary || 'Not available'}
Accessibility agent summary: ${accessibility?.summary || 'Not available'}
Housing agent summary: ${housing?.summary || 'Not available'}

Starting scores: Climate ${climate?.score ?? 'N/A'}, Accessibility ${accessibility?.score ?? 'N/A'}, Housing ${housing?.score ?? 'N/A'}

2026 = verified baseline / existing conditions today (scores close to starting scores; projectedChanges MUST use verified baseline values exactly where provided).
2040 = adaptive transition (immediate + medium-term actions largely complete; projectedChanges use verified baselines as "before" values).
2075 = resilient future (full long-term vision; projectedChanges use verified baselines as "before" values).

Return exactly this JSON (no other text):
{
${scenarioSchema('2026', 'showing current/unimproved conditions', 'close to the starting scores', true)},
${scenarioSchema('2040', 'showing a moderately transformed streetscape', 'meaningfully higher than 2026', false)},
${scenarioSchema('2075', 'showing a fully realized, mature climate-resilient district', 'highest, near-ceiling scores', false)}
}

For each visualizationPrompt: use verified baseline conditions when describing the 2026 current site (sparse canopy if NLCD canopy is low, visible BART/transit hub proximity if verified, flood-resilience context from FEMA zone). \
For 2040/2075, add projected visual elements from the recommendations (e.g. tree-lined protected bike lanes, mixed-use buildings, green rooftops, bioswales), scaled to the time horizon. \
Maintain recognizable characteristics of ${site.name} — its actual regional architecture, climate, topography, and street character. \
Do not substitute another city's landmarks or characteristics. Make each prompt vivid, specific, and visually distinct.`;
}

async function generateVision(ctx, agentOutputs) {
  const prompt = buildVisionPrompt(ctx, agentOutputs);
  return callAgent(SYSTEM, prompt, 'claude-sonnet-4-6', 3072);
}

module.exports = {
  generateVision,
  buildVisionPrompt,
  formatVerifiedBaselines,
};
