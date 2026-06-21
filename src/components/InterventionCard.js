import React from 'react';
import { TreePine, Bike, Building2 } from 'lucide-react';
import { Badge } from './ui/badge';

const INTERVENTION_IMAGES = [
  { match: /tree canopy|street tree/i, img: '/images/interventions/tree-canopy.jpg' },
  { match: /bioswale|permeable|green infrastructure|stormwater/i, img: '/images/interventions/permeable-streets.jpg' },
  { match: /ada|crossing|accessib/i, img: '/images/interventions/ada-crossing.jpg' },
  { match: /bike|bicycle|cycling/i, img: '/images/interventions/transit-expansion.jpg' },
  { match: /transit-oriented|mixed-use housing|affordable housing/i, img: '/images/interventions/affordable-housing.jpg' },
  { match: /infill|small-site|small-lot/i, img: '/images/interventions/infill-housing.jpg' },
];

const COST_LABEL = { low: '$', medium: '$$', high: '$$$' };
const CATEGORY_STYLE = {
  climate: { icon: TreePine, color: 'text-civic-accent' },
  accessibility: { icon: Bike, color: 'text-civic-accessibility' },
  housing: { icon: Building2, color: 'text-civic-housing' },
};

function getInterventionImage(rec) {
  const text = `${rec.title} ${rec.description}`;
  return INTERVENTION_IMAGES.find(m => m.match.test(text))?.img || null;
}

// Civic-planning redesign Phase 4: a single-column list row instead of a 2-up thumbnail grid,
// to make room for cost/timeline/rationale alongside the name — all existing `rec` fields
// already returned by the backend, nothing invented. `rec.impact` (the AI-assigned weight per
// category) still drives the "expected impact" line exactly as before.
export default function InterventionCard({ rec }) {
  const cat = rec.id?.startsWith('cr') ? 'climate' : rec.id?.startsWith('ar') ? 'accessibility' : 'housing';
  const { icon: Icon, color } = CATEGORY_STYLE[cat];
  const image = getInterventionImage(rec);
  const topImpact = Object.entries(rec.impact || {}).sort((a, b) => b[1] - a[1])[0];

  return (
    <div className="flex gap-3 border-b border-civic-border last:border-0 py-2.5 last:pb-0">
      <div className="w-14 h-14 rounded-lg overflow-hidden shrink-0 bg-civic-surface-secondary border border-civic-border flex items-center justify-center">
        {image ? <img src={image} alt="" className="w-full h-full object-cover" /> : <Icon className={`w-5 h-5 ${color}`} />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-1.5">
          <Icon className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${color}`} />
          <div className="text-xs font-semibold text-civic-text leading-snug">{rec.title}</div>
        </div>
        {rec.description && (
          <p className="text-[11px] text-civic-text-muted leading-snug mt-1 line-clamp-2">{rec.description}</p>
        )}
        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
          {topImpact && <Badge tone={CATEGORY_STYLE[cat] ? `civic-category-${cat}` : 'neutral'}>+{topImpact[1]} {topImpact[0]}</Badge>}
          {rec.cost && <span className="text-[10px] text-civic-text-muted">{COST_LABEL[rec.cost] || rec.cost}</span>}
          {rec.timeline && <span className="text-[10px] text-civic-text-muted">{rec.timeline.replace('_', ' ')}</span>}
        </div>
      </div>
    </div>
  );
}
