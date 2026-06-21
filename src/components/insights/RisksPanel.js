import React from 'react';
import { AlertTriangle } from 'lucide-react';
import RiskItem from './RiskItem';

export default function RisksPanel({ risks }) {
  return (
    <div>
      {risks.map(r => (
        <RiskItem key={r.id} risk={r} />
      ))}
      <div className="flex items-center gap-2 mt-3 text-xs text-slate-600">
        <AlertTriangle className="w-3.5 h-3.5" />
        Severity 1 (low) → 5 (critical)
      </div>
    </div>
  );
}
