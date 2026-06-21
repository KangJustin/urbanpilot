import React from 'react';
import InterventionCard from './InterventionCard';

export default function InterventionsStrip({ recommendations, limit = 6 }) {
  if (!recommendations?.length) return null;

  return (
    <div className="shrink-0 border-t border-slate-800 bg-up-charcoal px-5 py-3">
      <div className="up-label font-medium mb-2">Recommended Interventions</div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {recommendations.slice(0, limit).map(r => (
          <InterventionCard key={r.id} rec={r} />
        ))}
      </div>
    </div>
  );
}
