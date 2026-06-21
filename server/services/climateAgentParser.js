// Climate Agent JSON extraction, repair, and safe fallback parsing.

function repairCommonJsonIssues(text) {
  let repaired = text;
  repaired = repaired.replace(/,\s*([}\]])/g, '$1');
  repaired = repaired.replace(/[\u201C\u201D]/g, '"').replace(/[\u2018\u2019]/g, "'");
  repaired = repaired.replace(/^\s*\/\/.*$/gm, '');
  return repaired.trim();
}

function closeTruncatedJson(text) {
  let body = text.trim();
  if (!body.startsWith('{')) return body;

  const openBraces = (body.match(/{/g) || []).length;
  const closeBraces = (body.match(/}/g) || []).length;
  const openBrackets = (body.match(/\[/g) || []).length;
  const closeBrackets = (body.match(/]/g) || []).length;

  if (openBrackets > closeBrackets) body += ']'.repeat(openBrackets - closeBrackets);
  if (openBraces > closeBraces) body += '}'.repeat(openBraces - closeBraces);
  return repairCommonJsonIssues(body);
}

function tryParse(label, text) {
  try {
    return { ok: true, parsed: JSON.parse(text), strategy: label };
  } catch (err) {
    return { ok: false, error: err.message, strategy: label };
  }
}

function extractJsonCandidates(text) {
  const candidates = [];
  const trimmed = text.trim();
  if (trimmed) candidates.push(trimmed);

  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) candidates.push(fenced[1].trim());

  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    candidates.push(text.slice(firstBrace, lastBrace + 1));
  }

  return [...new Set(candidates.filter(Boolean))];
}

function parseClimateAgentJson(rawText) {
  const attempts = [];

  for (const candidate of extractJsonCandidates(rawText)) {
    for (const label of ['direct', 'repaired', 'closed']) {
      let text = candidate;
      if (label === 'repaired') text = repairCommonJsonIssues(candidate);
      if (label === 'closed') text = closeTruncatedJson(repairCommonJsonIssues(candidate));

      const result = tryParse(`${label}:${candidate.slice(0, 40)}…`, text);
      attempts.push(result);
      if (result.ok) {
        return { parsed: result.parsed, strategy: result.strategy, attempts };
      }
    }
  }

  return { parsed: null, strategy: null, attempts };
}

function buildClimateFallback({ site, goal, climateResult, rawText, parseError }) {
  const c = climateResult.climateData;
  const climateLine = climateResult.climateAvailable && c
    ? `Current conditions: ${c.temperatureF != null ? `${Math.round(c.temperatureF)}°F` : 'N/A'}, `
      + `${c.weatherDescription || 'Unknown'} (US AQI ${c.usAqi ?? 'N/A'}, ${c.aqiCategory || 'N/A'}). `
    : '';

  return {
    score: 50,
    summary: `${climateLine}Automated climate interpretation was unavailable for ${site?.name || 'this site'}. `
      + `Planning goal: ${goal?.description || 'not specified'}. `
      + 'Review verified Open-Meteo metrics below and re-run analysis if needed.',
    findings: climateResult.climateAvailable
      ? [
        c.temperatureF != null
          ? `Current temperature: ${Math.round(c.temperatureF)}°F (${c.weatherDescription}, Open-Meteo Weather API)`
          : 'Current temperature unavailable from Open-Meteo.',
        c.usAqi != null
          ? `Current US AQI: ${c.usAqi} (${c.aqiCategory}, Open-Meteo Air Quality API)`
          : 'Current US AQI unavailable from Open-Meteo.',
        'Heat island, flood, canopy, and long-term resilience findings require a successful agent response.',
        'Detailed AI climate findings could not be parsed — use verified climateData for current conditions.',
      ]
      : [
        'Open-Meteo weather/AQI data was not available for this location.',
        'Climate findings require a successful agent response or Open-Meteo lookup.',
        'Re-run analysis to retry interpretation.',
        'Flood, canopy, and heat-island estimates are not included in this fallback.',
      ],
    risks: [
      {
        id: 'cr1',
        title: 'Analysis Parse Failure',
        description: parseError || 'The climate agent response could not be parsed as JSON.',
        severity: 2,
        category: 'climate',
      },
    ],
    recommendations: [
      {
        id: 'crec1',
        title: 'Re-run Climate Analysis',
        description: 'Retry the analysis to generate full climate resilience recommendations.',
        cost: 'low',
        timeline: 'short_term',
        priority: 1,
        impact: { climate: 5, accessibility: 0, housing: 0, equity: 0 },
      },
    ],
    parseFallback: true,
    rawResponsePreview: rawText ? rawText.slice(0, 500) : null,
  };
}

module.exports = {
  parseClimateAgentJson,
  buildClimateFallback,
};
