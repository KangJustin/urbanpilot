import React from 'react';

export default function DemoBadge({ children = 'Demo Data' }) {
  return (
    <span className="inline-flex items-center rounded-full border border-amber-700/40 bg-amber-950/30 px-2 py-0.5 text-[10px] font-medium text-amber-400">
      {children}
    </span>
  );
}
