import React from 'react';
import { SEVERITY_COLORS } from '../../utils/planningHelpers';

export default function RiskItem({ risk }) {
  return (
    <div className="flex gap-3 py-2 border-b border-slate-800/60 last:border-0">
      <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${SEVERITY_COLORS[risk.severity] || 'bg-slate-500'}`} />
      <div>
        <div className="text-sm font-medium text-white">{risk.title}</div>
        <div className="text-xs text-slate-400 mt-0.5 leading-relaxed">{risk.description}</div>
      </div>
    </div>
  );
}
