import React from 'react';
import { CheckCircle2, Calculator, Info, MinusCircle } from 'lucide-react';
import { Badge } from './badge';

// Data-provenance labeling, civic-planning redesign Phase 1 (additive primitive, not yet wired
// into any live page). Every status pairs an icon with text — never color alone — per the
// accessibility color-not-only guidance. See design-system/MASTER.md for the provenance trace
// that justifies each status (in particular: climateData.femaFloodRisk is "verified" because it's
// a deterministic, non-AI lookup over real FEMA fields, not an AI judgment call — the header's
// existing AI-derived "Flood Risk" badge is a separate code path and stays "ai").
const STATUS = {
  verified: { icon: CheckCircle2, tone: 'civic-verified', label: 'Verified' },
  modeled: { icon: Calculator, tone: 'civic-modeled', label: 'Modeled' },
  ai: { icon: Info, tone: 'civic-ai', label: 'AI-estimated' },
  unavailable: { icon: MinusCircle, tone: 'civic-unavailable', label: 'Unavailable' },
};

// Abbreviations in `source` get an accessible expansion via <abbr title>, per the redesign's
// accessibility requirement that FEMA/NLCD/ACS/511 not be left as bare, unexplained acronyms.
const ABBR_TITLES = {
  FEMA: 'Federal Emergency Management Agency',
  NLCD: 'National Land Cover Database',
  ACS: 'American Community Survey',
  511: '511 SF Bay regional transit data',
};
const ABBR_PATTERN = /\b(FEMA|NLCD|ACS|511)\b/g;

function renderSource(source) {
  const parts = source.split(ABBR_PATTERN);
  return parts.map((part, i) => (ABBR_TITLES[part]
    ? <abbr key={i} title={ABBR_TITLES[part]} className="no-underline">{part}</abbr>
    : <React.Fragment key={i}>{part}</React.Fragment>));
}

// `source` is the specific provider (e.g. "Open-Meteo", "FEMA", "NLCD", "511",
// "U.S. Census ACS") appended after the status label. Omit it for ai/unavailable, where there's
// no specific external source to cite.
export default function ProvenanceChip({ status, source, className }) {
  const entry = STATUS[status];
  if (!entry) return null;
  const { icon: Icon, tone, label } = entry;
  return (
    <Badge tone={tone} className={className}>
      <Icon className="w-3 h-3" />
      {source ? <>{label} · {renderSource(source)}</> : label}
    </Badge>
  );
}
