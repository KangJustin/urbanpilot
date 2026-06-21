import React from 'react';
import { TreePine, Bike, Building2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Badge } from './ui/badge';

const COST_LABEL = { low: '$', medium: '$$', high: '$$$' };
const CATEGORY_ICON = { climate: TreePine, accessibility: Bike, housing: Building2 };
const CATEGORY_TONE = { climate: 'emerald', accessibility: 'sky', housing: 'amber' };

function categoryOf(rec) {
  return rec.id?.startsWith('cr') ? 'climate' : rec.id?.startsWith('ar') ? 'accessibility' : 'housing';
}

export default function RecommendationsPanel({ recommendations }) {
  const sorted = [...(recommendations || [])].sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99));

  return (
    <Card>
      <CardHeader><CardTitle>Top Recommendations</CardTitle></CardHeader>
      <CardContent>
        {sorted.length === 0 ? (
          <p className="text-[11px] text-slate-500 italic">Run an analysis to see recommendations.</p>
        ) : (
          <>
            <div className="space-y-2.5">
              {sorted.slice(0, 5).map(rec => {
                const cat = categoryOf(rec);
                const Icon = CATEGORY_ICON[cat] || TreePine;
                return (
                  <div key={rec.id} className="border-b border-slate-800/60 last:border-0 pb-2.5 last:pb-0">
                    <div className="flex items-start gap-2">
                      <span className={`mt-0.5 shrink-0 ${CATEGORY_TONE[cat] === 'emerald' ? 'text-emerald-400' : CATEGORY_TONE[cat] === 'sky' ? 'text-sky-400' : 'text-amber-400'}`}>
                        <Icon className="w-3.5 h-3.5" />
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-white">{rec.title}</div>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          {rec.cost && <span className="text-[10px] text-slate-400">{COST_LABEL[rec.cost] || rec.cost}</span>}
                          {rec.timeline && <span className="text-[10px] text-slate-500">{rec.timeline.replace('_', ' ')}</span>}
                          {rec.priority != null && <Badge tone={CATEGORY_TONE[cat]}>Priority {rec.priority}</Badge>}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-2 text-[10px] text-slate-500">Based on current conditions</div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
