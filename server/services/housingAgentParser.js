// Housing Agent JSON extraction, repair, and safe fallback parsing.

function stripMarkdownFences(text) {
  return text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}

function repairCommonJsonIssues(text) {
  let repaired = text;
  // Remove trailing commas before } or ]
  repaired = repaired.replace(/,\s*([}\]])/g, '$1');
  // Replace smart quotes
  repaired = repaired.replace(/[\u201C\u201D]/g, '"').replace(/[\u2018\u2019]/g, "'");
  // Remove // line comments (outside strings — best-effort)
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

  if (openBrackets > closeBrackets) {
    body += ']'.repeat(openBrackets - closeBrackets);
  }
  if (openBraces > closeBraces) {
    body += '}'.repeat(openBraces - closeBraces);
  }
  return repairCommonJsonIssues(body);
}

function tryParse(label, text) {
  try {
    const parsed = JSON.parse(text);
    return { ok: true, parsed, strategy: label };
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

  // First { to last } — greedy object slice
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    candidates.push(text.slice(firstBrace, lastBrace + 1));
  }

  return [...new Set(candidates.filter(Boolean))];
}

function parseHousingAgentJson(rawText) {
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

function buildHousingFallback({ site, goal, censusResult, rawText, parseError }) {
  const censusLine = censusResult.censusAvailable && censusResult.censusData?.medianRent != null
    ? `Median Gross Rent: $${censusResult.censusData.medianRent.toLocaleString('en-US')} (${censusResult.censusData.source}). `
    : '';

  return {
    score: 50,
    summary: `${censusLine}Automated housing interpretation was unavailable for ${site?.name || 'this site'}. `
      + `Planning goal: ${goal?.description || 'not specified'}. `
      + 'Review verified census metrics below and re-run analysis if needed.',
    findings: censusResult.censusAvailable
      ? [
        censusResult.censusData.medianRent != null
          ? `Median Gross Rent: $${censusResult.censusData.medianRent.toLocaleString('en-US')} (${censusResult.censusData.source})`
          : 'Census ACS data retrieved for this block group.',
        censusResult.censusData.medianIncome != null
          ? `Median Household Income: $${censusResult.censusData.medianIncome.toLocaleString('en-US')} (${censusResult.censusData.source})`
          : 'Median household income available in censusData.',
        censusResult.censusData.renterPercent != null
          ? `Percent Renter Occupied: ${censusResult.censusData.renterPercent}% (${censusResult.censusData.source})`
          : 'Renter occupancy rate available in censusData.',
        'Detailed AI housing findings could not be parsed — use verified censusData for baseline metrics.',
      ]
      : [
        'Census ACS data was not available for this location.',
        'Housing findings require a successful agent response or ACS lookup.',
        'Re-run analysis to retry interpretation.',
        'Zoning and displacement estimates are not included in this fallback.',
      ],
    risks: [
      {
        id: 'hr1',
        title: 'Analysis Parse Failure',
        description: parseError || 'The housing agent response could not be parsed as JSON.',
        severity: 2,
        category: 'housing',
      },
    ],
    recommendations: [
      {
        id: 'hrec1',
        title: 'Re-run Housing Analysis',
        description: 'Retry the analysis to generate full planning recommendations.',
        cost: 'low',
        timeline: 'short_term',
        priority: 1,
        impact: { climate: 0, accessibility: 0, housing: 5, equity: 0 },
      },
    ],
    parseFallback: true,
    rawResponsePreview: rawText ? rawText.slice(0, 500) : null,
  };
}

module.exports = {
  parseHousingAgentJson,
  buildHousingFallback,
  stripMarkdownFences,
};
