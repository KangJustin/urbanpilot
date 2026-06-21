# UrbanPilot Design System — Civic Planning Redesign (Master)

Branch: `redesign/civic-planning-ui`. Status: **Phase 1 complete** (additive tokens + primitives
only — no page composition, API, state, or behavior changes anywhere in this phase).

## Tokens

### Civic palette (new, `tailwind.config.js` → `theme.extend.colors.civic`)

| Token | Value | Use |
|---|---|---|
| `civic-bg` | `#F4F6F3` | App background |
| `civic-surface` | `#FFFFFF` | Primary cards/panels |
| `civic-surface-secondary` | `#F8FAF8` | Secondary surfaces, chip backgrounds |
| `civic-border` | `#DDE3DF` | All borders/dividers |
| `civic-text` | `#17201C` | Primary text |
| `civic-text-muted` | `#65706A` | Secondary text, labels |
| `civic-accent` | `#167A59` | Primary actions, Climate category, Verified |
| `civic-accessibility` | `#3975A8` | Accessibility category, geographic data |
| `civic-housing` | `#B7791F` | Housing category, modeled data |
| `civic-risk-low` | `#167A59` | Severity: Low |
| `civic-risk-moderate` | `#B7791F` | Severity: Moderate |
| `civic-risk-high` | `#C2410C` | Severity: High |
| `civic-risk-critical` | `#B91C1C` | Severity: Critical — **red reserved for this tier only** |

`shadow-civic-sm` (`0 1px 2px rgba(23,32,28,0.06)`) is the only new elevation step — no colored
shadows, no glow, no blur/glassmorphism anywhere in the civic palette.

### Legacy tokens (`tailwind.config.js` → `theme.extend.colors.up`) — unchanged, still live

**These are a separate namespace, not renamed, not removed, not aliased.** Full audit:

| Token | Live usage | Orphaned-tree-only usage |
|---|---|---|
| `up-navy` | `src/index.css:10` (global `body` background — **live on every page**) | `layout/AppShell.js` |
| `up-surface` | `src/index.css:21` (`.up-panel-solid` definition) | — |
| `up-border` | `src/index.css:21` (`.up-panel-solid` definition) | `layout/TopHeader.js` |
| `up-charcoal` | none | `layout/TopHeader.js`, `interventions/InterventionsStrip.js` |
| `up-accent` | none (Tailwind color) — `boxShadow.up-accent` separately unused anywhere | `layout/TopHeader.js` |
| `up-surface-raised`, `up-border-subtle`, `up-accent-muted`, `up-accent-glow` | none found | none found |
| `.up-panel`, `.up-card`, `.up-card-compact`, `.up-label`, `.up-heading`, `.up-btn-primary`, `.up-input`, `.up-live-badge` (custom classes, `index.css` `@layer components`) | defined in `index.css` but not used by any live component | `analysis/AgentPipeline.js`, `insights/RecommendationCard.js`, `interventions/InterventionCard.js`, `interventions/InterventionsStrip.js`, `shared/ConditionsBar.js` |

**Conclusion:** `up-navy`/`up-surface`/`up-border` cannot be removed or repurposed without a visible
change to the live global body background and the (currently-unused-but-defined) `.up-panel-solid`
class. No alias was needed in Phase 1 because nothing was renamed or removed — the civic palette
uses entirely distinct names. The orphaned `layout/`, `analysis/`, `insights/`, `interventions/`,
`shared/`, `map/` trees were not imported, activated, or modified — they still compile against the
unchanged `up.*` tokens exactly as before.

## Data provenance — traced, not inferred from field names

| Field | Source | Status |
|---|---|---|
| `climateData.temperatureF`, `climateData.usAqi`, `conditions.temperatureF`, `conditions.aqi` | Open-Meteo API, returned as-is | `verified` · Open-Meteo |
| `climateData.femaFloodZone`, `inSpecialFloodHazardArea`, `baseFloodElevationFt` | FEMA NFHL `FLD_ZONE`/`SFHA_TF`/`STATIC_BFE`, returned as-is | `verified` · FEMA |
| `climateData.femaFloodRisk` | **Not a raw FEMA field.** Computed by `femaNfhlService.js`'s `floodRiskFromZone()` — a deterministic, non-AI lookup table over the verified zone/SFHA/subtype fields above | `verified` · FEMA (derived, not interpreted — documented so it's never confused with an AI judgment) |
| `climateData.treeCanopyPercent` | NLCD Tree Canopy Cover 2023, returned as-is | `verified` · NLCD |
| `transitData.*` | 511 SF Bay Regional GTFS, returned as-is | `verified` · 511 |
| `censusData.*` | U.S. Census ACS 5-Year, returned as-is | `verified` · U.S. Census ACS |
| Header "Flood Risk" badge (`ConditionsBar.js`, via `planningHelpers.js: getFloodRisk(climate)`) | Searches the AI-generated `climate.risks` array for a title matching `/flood\|stormwater\|runoff/i`; returns the AI's own severity. **No reference to `climateData.femaFloodRisk` at all** — a fully separate code path that happens to share a topic | `ai` (already correctly labeled "AI-estimated" today — do not change) |
| Header "Heat Risk" badge (`getHeatRisk`) | Same pattern: AI risk-list lookup, or a score-based fallback. No verified heat dataset exists anywhere in this codebase | `ai` |
| Rent-to-income ratio, persons-per-unit (seen in agent narrative text) | Simple arithmetic over two verified ACS numbers | `modeled` |
| Agent summaries, findings, risk severity judgments, recommendation cost/priority/impact weights | Claude-generated | `ai` |

**Rule going forward:** never assign `verified` based on a field name alone — trace the actual
backend function before labeling a new metric in Phase 3+.

## Null-safety rule (applies to every new formatter, not just Phase 1)

Render the literal number when the API returned a real `0`. Render "Not reported" /
"Unavailable" only when the value is `null` or `undefined`. Use `value !== null && value !==
undefined` (or `value == null` as the inverse, which is equivalent in JS) — **never** a bare
truthiness check (`if (value)`), since that silently treats a real `0` as missing. The existing
`fmtField()` in `AgentCard.js` already follows this correctly; `ProvenanceChip`/`SeverityBadge`
introduce no new formatting logic that could violate it (severity is always a 1-5 integer when
present, never a quantity that can legitimately be zero).

## Primitives

### `ProvenanceChip` (`src/components/ui/provenance-chip.js`)

```jsx
<ProvenanceChip status="verified" source="Open-Meteo" />   {/* "✓ Verified · Open-Meteo" */}
<ProvenanceChip status="modeled" />                         {/* "calc Modeled" */}
<ProvenanceChip status="ai" />                               {/* "ⓢ AI-estimated" */}
<ProvenanceChip status="unavailable" />                      {/* "⊖ Unavailable" */}
```

Icon + text on every status — never color alone. `ai`/`unavailable` use the same muted gray
(deliberately not alarming — AI-estimated is the normal case in this product, not an error).

### `SeverityBadge` (`src/components/ui/severity-badge.js`)

```jsx
<SeverityBadge severity={1} />   {/* dot icon, Low, green */}
<SeverityBadge severity={3} />   {/* circle-alert icon, Moderate, amber */}
<SeverityBadge severity={4} />   {/* triangle-alert icon, High, orange-red */}
<SeverityBadge severity={5} />   {/* octagon-alert icon, Critical, red */}
<SeverityBadge severity={null} /> {/* help-circle icon, "Unknown" — never guesses Low */}
```

Icon shape escalates with severity (dot → circle → triangle → octagon), not just color — red is
reserved for Critical only, matching your "red only for serious risk" instruction.

Both components extend `ui/badge.js`'s existing `cva` tone map additively (new `civic-*` tone
keys) — every pre-existing tone (`neutral/emerald/amber/rose/sky/violet`) is untouched, so every
current dark-theme usage in `RisksPanel.js`, `RecommendationsPanel.js`, `AgentCard.js`, etc.
renders identically to before.

## Map tile note (for Phase 5, not done yet)

CARTO (same provider, no logic change) serves a `light_all` style at the same URL pattern as the
current `dark_all` — confirms the basemap swap your constraint requires is a pure tile-style URL
change in `MainMapPanel.js`. The `.map-tiles-enhanced` brightness/contrast filter in `index.css`
exists specifically to compensate for the dark tiles' legibility and should be dropped once the
swap happens, not before.
