// Accessibility Agent JSON extraction, repair, and safe fallback parsing.

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

function parseAccessibilityAgentJson(rawText) {
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

function buildAccessibilityFallback({ site, goal, transitResult, rawText, parseError }) {
  const t = transitResult.transitData;
  const transitLine = transitResult.transitAvailable && t
    ? `${t.nearbyStops800m} transit stops within 800m (${t.source}). `
    : '';

  return {
    score: 50,
    summary: `${transitLine}Automated accessibility interpretation was unavailable for ${site?.name || 'this site'}. `
      + `Planning goal: ${goal?.description || 'not specified'}. `
      + 'Review verified transit metrics below and re-run analysis if needed.',
    findings: transitResult.transitAvailable
      ? [
        `Nearby transit stops within 400m: ${t.nearbyStops400m} (${t.source})`,
        `Nearby transit stops within 800m: ${t.nearbyStops800m} (${t.source})`,
        `Unique routes within 800m: ${t.uniqueRoutes800m}; modes: ${(t.modes800m || []).join(', ') || 'none'}`,
        t.nearestHub?.name
          ? `Nearest transit hub: ${t.nearestHub.name} (${t.nearestHub.distanceM}m)`
          : 'No station-level hub within 800m in GTFS data.',
      ]
      : [
        '511 SF Bay transit data was not available for this location.',
        'Transit access findings require a successful agent response or GTFS lookup.',
        'Re-run analysis to retry interpretation.',
        'Walkability and bike connectivity estimates are not included in this fallback.',
      ],
    risks: [
      {
        id: 'ar1',
        title: 'Analysis Parse Failure',
        description: parseError || 'The accessibility agent response could not be parsed as JSON.',
        severity: 2,
        category: 'accessibility',
      },
    ],
    recommendations: [
      {
        id: 'arec1',
        title: 'Re-run Accessibility Analysis',
        description: 'Retry the analysis to generate full mobility recommendations.',
        cost: 'low',
        timeline: 'short_term',
        priority: 1,
        impact: { climate: 0, accessibility: 5, housing: 0, equity: 0 },
      },
    ],
    parseFallback: true,
    rawResponsePreview: rawText ? rawText.slice(0, 500) : null,
  };
}

module.exports = {
  parseAccessibilityAgentJson,
  buildAccessibilityFallback,
};
