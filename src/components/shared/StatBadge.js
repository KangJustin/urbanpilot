import React from 'react';

export default function StatBadge({ label, value, color }) {
  return (
    <div className="text-right shrink-0">
      <div className="text-[10px] text-slate-500 leading-tight">{label}</div>
      <div className={`text-xs font-semibold leading-tight ${color}`}>{value}</div>
    </div>
  );
}
