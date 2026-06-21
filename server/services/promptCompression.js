// Shared terse-encoding helpers for agent prompts (housing/climate/accessibility).
// These exist to cut per-request token cost: the risks/recommendations/impact
// shape below is byte-for-byte identical across the three scoring agents, so it's
// defined once instead of being hand-written (pretty-printed, ~25 lines) in each.

function compactRiskRecSchema(idPrefix, category) {
  return `"findings":["<finding>","<finding>","<finding>","<finding>"],`
    + `"risks":[{"id":"${idPrefix}r1","title":"<t>","description":"<d>","severity":<1-5>,"category":"${category}"},`
    + `{"id":"${idPrefix}r2","title":"<t>","description":"<d>","severity":<1-5>,"category":"${category}"}],`
    + `"recommendations":[{"id":"${idPrefix}rec1","title":"<t>","description":"<d>","cost":"low|medium|high",`
    + `"timeline":"short_term|medium_term|long_term","priority":<int>,"impact":{"climate":<int>,"accessibility":<int>,"housing":<int>,"equity":<int>}},`
    + `{"id":"${idPrefix}rec2","title":"<t>","description":"<d>","cost":"low|medium|high",`
    + `"timeline":"short_term|medium_term|long_term","priority":<int>,"impact":{"climate":<int>,"accessibility":<int>,"housing":<int>,"equity":<int>}}]`;
}

// Renders a flat list of [label, value] pairs as "label=value" tokens, dropping
// any pair whose value is null/undefined so absent metrics don't cost tokens.
function compactKeyValueLine(pairs) {
  return pairs
    .filter(([, value]) => value != null)
    .map(([label, value]) => `${label}=${value}`)
    .join(' ');
}

module.exports = { compactRiskRecSchema, compactKeyValueLine };
