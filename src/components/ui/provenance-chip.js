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
      {source ? `${label} · ${source}` : label}
    </Badge>
  );
}
