import React from 'react';
import { CircleDot, AlertCircle, AlertTriangle, AlertOctagon, HelpCircle } from 'lucide-react';
import { Badge } from './badge';

// Severity scale, civic-planning redesign Phase 1 (additive primitive, not yet wired into any
// live page). Mirrors the existing 1-5 severity scale already used by RisksPanel.js's
// SEVERITY_TONE/SEVERITY_LABEL and planningHelpers.js's severityLabel() — this component doesn't
// change that scale, it's a restyled, icon-bearing presentation of the same values, intended to
// eventually replace the duplicated logic in both places (not done in Phase 1).
// Icon shape escalates with severity (dot -> circle -> triangle -> octagon) so meaning isn't
// color-only, per the accessibility color-not-only guideline. "Red reserved for serious risk
// only" — Critical is the only tone using civic-risk-critical (red); High uses an orange-red,
// distinct from both Critical and Moderate.
const LEVELS = {
  1: { label: 'Low', tone: 'civic-risk-low', icon: CircleDot },
  2: { label: 'Low', tone: 'civic-risk-low', icon: CircleDot },
  3: { label: 'Moderate', tone: 'civic-risk-moderate', icon: AlertCircle },
  4: { label: 'High', tone: 'civic-risk-high', icon: AlertTriangle },
  5: { label: 'Critical', tone: 'civic-risk-critical', icon: AlertOctagon },
};

// `severity` must be an explicit 1-5 integer from real risk data. A missing/invalid value never
// guesses "Low" — it renders an explicit "Unknown" state instead (same principle as not treating
// a missing numeric metric as zero: don't silently substitute a plausible-looking default).
export default function SeverityBadge({ severity, className }) {
  const entry = severity !== null && severity !== undefined ? LEVELS[severity] : null;
  if (!entry) {
    return (
      <Badge tone="civic-unknown" className={className}>
        <HelpCircle className="w-3 h-3" />
        Unknown
      </Badge>
    );
  }
  const { label, tone, icon: Icon } = entry;
  return (
    <Badge tone={tone} className={className}>
      <Icon className="w-3 h-3" />
      {label}
    </Badge>
  );
}
