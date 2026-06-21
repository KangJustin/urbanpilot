// Null-safe display formatters, civic-planning redesign Phase 3. A real numeric 0 must render
// as 0 — every check below is an explicit null/undefined/finite check, never a truthiness check
// (`value ? value : fallback` would incorrectly treat 0 as missing). Scoped to what
// CurrentConditionsPanel.js actually needs this phase — not a broad utility refactor; AgentCard.js
// keeps its own existing fmtField/fmtUsd untouched.

export function fmtValue(value, fallback = 'Not reported') {
  return value === null || value === undefined ? fallback : value;
}

export function fmtNumber(value, { suffix = '', round = false, fallback = 'Not reported' } = {}) {
  if (value === null || value === undefined || !Number.isFinite(value)) return fallback;
  return `${round ? Math.round(value) : value}${suffix}`;
}

export function fmtPercent(value, opts = {}) {
  return fmtNumber(value, { suffix: '%', ...opts });
}

export function fmtTemperatureF(value, opts = {}) {
  return fmtNumber(value, { suffix: '°F', round: true, ...opts });
}

export function fmtUsd(value, fallback = 'Not reported') {
  if (value === null || value === undefined || !Number.isFinite(value)) return fallback;
  return `$${value.toLocaleString('en-US')}`;
}
