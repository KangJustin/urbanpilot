import React, { useState } from 'react';
import { AlertTriangle, ChevronDown } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Badge } from './ui/badge';

const SEVERITY_TONE = [null, 'emerald', 'emerald', 'amber', 'rose', 'rose'];
const SEVERITY_LABEL = [null, 'Low', 'Low', 'Moderate', 'High', 'Critical'];
const CATEGORY_TONE = { climate: 'emerald', accessibility: 'sky', housing: 'amber' };

function RiskRow({ risk }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-slate-800/60 last:border-0 py-2 last:pb-0">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center gap-1.5 text-left">
        <ChevronDown className={`w-3 h-3 text-slate-500 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
        <span className="text-xs font-medium text-white flex-1 min-w-0 truncate">{risk.title}</span>
        <Badge tone={SEVERITY_TONE[risk.severity] || 'neutral'}>{SEVERITY_LABEL[risk.severity] || 'Unknown'}</Badge>
      </button>
      {open && (
        <div className="pl-[18px] mt-1.5">
          {risk.category && <Badge tone={CATEGORY_TONE[risk.category] || 'neutral'} className="mb-1.5">{risk.category}</Badge>}
          <p className="text-[11px] text-slate-400 leading-relaxed">{risk.description}</p>
        </div>
      )}
    </div>
  );
}

// Reflects the current-conditions analysis — our backend doesn't generate separate risk
// lists per scenario year, so this stays constant across 2026/2040/2075 selection rather
// than fabricating year-specific variants.
export default function RisksPanel({ risks }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Top Risks</CardTitle>
          {risks?.length > 0 && <span className="text-[10px] text-slate-400">{risks.length} found</span>}
        </div>
      </CardHeader>
      <CardContent>
        {!risks || risks.length === 0 ? (
          <p className="text-[11px] text-slate-500 italic">Run an analysis to see risks.</p>
        ) : (
          <div>
            {risks.slice(0, 5).map(r => <RiskRow key={r.id} risk={r} />)}
          </div>
        )}
        {risks?.length > 0 && (
          <div className="flex items-center gap-1.5 mt-2 text-[10px] text-slate-500">
            <AlertTriangle className="w-3 h-3" /> Based on current conditions · severity 1 (low) → 5 (critical)
          </div>
        )}
      </CardContent>
    </Card>
  );
}
