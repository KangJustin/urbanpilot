import React from 'react';
import { TreePine, Bike, Building2 } from 'lucide-react';
import { Badge } from './ui/badge';

const COST_LABEL = { low: '$', medium: '$$', high: '$$$' };
const CATEGORY_ICON = { climate: TreePine, accessibility: Bike, housing: Building2 };
const CATEGORY_COLOR = { climate: 'text-civic-accent', accessibility: 'text-civic-accessibility', housing: 'text-civic-housing' };
const CATEGORY_TONE = {
  climate: 'civic-category-climate',
  accessibility: 'civic-category-accessibility',
  housing: 'civic-category-housing',
};

function categoryOf(rec) {
  return rec.id?.startsWith('cr') ? 'climate' : rec.id?.startsWith('ar') ? 'accessibility' : 'housing';
}

// Renders bare (no Card/CardHeader wrapper) — civic-planning redesign Phase 4 hosts this
// inside PlanningFindings.js's tabbed container. Priority sort and the underlying
// recommendations array are unchanged.
export default function RecommendationsPanel({ recommendations }) {
  const sorted = [...(recommendations || [])].sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99));

  return (
    <div>
      {sorted.length === 0 ? (
        <p className="text-[11px] text-civic-text-muted italic">Run an analysis to see recommendations.</p>
      ) : (
        <>
          <div className="space-y-2.5">
            {sorted.slice(0, 5).map(rec => {
              const cat = categoryOf(rec);
              const Icon = CATEGORY_ICON[cat] || TreePine;
              return (
                <div key={rec.id} className="border-b border-civic-border last:border-0 pb-2.5 last:pb-0">
                  <div className="flex items-start gap-2">
                    <span className={`mt-0.5 shrink-0 ${CATEGORY_COLOR[cat]}`}>
                      <Icon className="w-3.5 h-3.5" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-civic-text">{rec.title}</div>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        {rec.cost && <span className="text-[10px] text-civic-text-muted">{COST_LABEL[rec.cost] || rec.cost}</span>}
                        {rec.timeline && <span className="text-[10px] text-civic-text-muted">{rec.timeline.replace('_', ' ')}</span>}
                        {rec.priority != null && <Badge tone={CATEGORY_TONE[cat]}>Priority {rec.priority}</Badge>}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-2 text-[10px] text-civic-text-muted">Based on current conditions</div>
        </>
      )}
    </div>
  );
}
