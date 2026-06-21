import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import InterventionCard from './InterventionCard';

// Lives in the right analysis panel, next to Top Recommendations — same underlying real
// recommendation data, just with reference imagery. Moved out of a full-width bottom strip
// (which competed with the 3-column layout) into a compact in-panel grid.
export default function InterventionsPanel({ recommendations }) {
  const recs = (recommendations || []).slice(0, 6);

  return (
    <Card>
      <CardHeader><CardTitle>Recommended Interventions</CardTitle></CardHeader>
      <CardContent>
        {recs.length === 0 ? (
          <p className="text-[11px] text-slate-500 italic">Run an analysis to see recommended interventions.</p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {recs.map(r => <InterventionCard key={r.id} rec={r} />)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
