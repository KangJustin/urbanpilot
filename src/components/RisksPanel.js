import React, { useState } from 'react';
import { AlertTriangle, ChevronDown } from 'lucide-react';
import { Badge } from './ui/badge';
import SeverityBadge from './ui/severity-badge';

const CATEGORY_TONE = {
  climate: 'civic-category-climate',
  accessibility: 'civic-category-accessibility',
  housing: 'civic-category-housing',
};

// SeverityBadge's 1-5 -> Low/Low/Moderate/High/Critical mapping is the same scale this panel
// already used (civic-planning redesign Phase 4) — using it here replaces the duplicate
// inline severity-tone/label arrays with the shared Phase 1 primitive, output unchanged.
function RiskRow({ risk }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-civic-border last:border-0 py-2 last:pb-0">
      <button
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className="w-full flex items-center gap-1.5 text-left rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-civic-accent/40">
        <ChevronDown className={`w-3 h-3 text-civic-text-muted shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
        <span className="text-xs font-medium text-civic-text flex-1 min-w-0 truncate">{risk.title}</span>
        <SeverityBadge severity={risk.severity} />
      </button>
      {open && (
        <div className="pl-[18px] mt-1.5">
          {risk.category && <Badge tone={CATEGORY_TONE[risk.category] || 'neutral'} className="mb-1.5">{risk.category}</Badge>}
          <p className="text-[11px] text-civic-text-muted leading-relaxed">{risk.description}</p>
        </div>
      )}
    </div>
  );
}

// Reflects the current-conditions analysis — our backend doesn't generate separate risk
// lists per scenario year, so this stays constant across 2026/2040/2075 selection rather
// than fabricating year-specific variants. Renders bare (no Card/CardHeader wrapper) — the
// civic-planning redesign hosts this inside PlanningFindings.js's tabbed container now.
export default function RisksPanel({ risks }) {
  return (
    <div>
      {risks?.length > 0 && (
        <div className="text-[10px] text-civic-text-muted mb-2">{risks.length} found</div>
      )}
      {!risks || risks.length === 0 ? (
        <p className="text-[11px] text-civic-text-muted italic">Run an analysis to see risks.</p>
      ) : (
        <div>
          {risks.slice(0, 5).map(r => <RiskRow key={r.id} risk={r} />)}
        </div>
      )}
      {risks?.length > 0 && (
        <div className="flex items-center gap-1.5 mt-2 text-[10px] text-civic-text-muted">
          <AlertTriangle className="w-3 h-3" /> Based on current conditions · severity 1 (low) → 5 (critical)
        </div>
      )}
    </div>
  );
}
