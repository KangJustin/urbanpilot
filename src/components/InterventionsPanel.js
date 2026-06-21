import React from 'react';
import InterventionCard from './InterventionCard';

// Renders bare (no Card/CardHeader wrapper) — civic-planning redesign Phase 4 hosts this
// inside PlanningFindings.js's tabbed container. Same underlying recommendation data/slice as
// before, just a single-column list instead of a 2-up grid (see InterventionCard.js).
export default function InterventionsPanel({ recommendations }) {
  const recs = (recommendations || []).slice(0, 6);

  return (
    <div>
      {recs.length === 0 ? (
        <p className="text-[11px] text-civic-text-muted italic">Run an analysis to see recommended interventions.</p>
      ) : (
        <div>
          {recs.map(r => <InterventionCard key={r.id} rec={r} />)}
        </div>
      )}
    </div>
  );
}
