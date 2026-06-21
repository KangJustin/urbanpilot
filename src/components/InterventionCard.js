import React from 'react';
import { TreePine, Bike, Building2 } from 'lucide-react';

const INTERVENTION_IMAGES = [
  { match: /tree canopy|street tree/i, img: '/images/interventions/tree-canopy.jpg' },
  { match: /bioswale|permeable|green infrastructure|stormwater/i, img: '/images/interventions/permeable-streets.jpg' },
  { match: /ada|crossing|accessib/i, img: '/images/interventions/ada-crossing.jpg' },
  { match: /bike|bicycle|cycling/i, img: '/images/interventions/transit-expansion.jpg' },
  { match: /transit-oriented|mixed-use housing|affordable housing/i, img: '/images/interventions/affordable-housing.jpg' },
  { match: /infill|small-site|small-lot/i, img: '/images/interventions/infill-housing.jpg' },
];

function getInterventionImage(rec) {
  const text = `${rec.title} ${rec.description}`;
  return INTERVENTION_IMAGES.find(m => m.match.test(text))?.img || null;
}

export default function InterventionCard({ rec }) {
  const cat = rec.id?.startsWith('cr') ? 'climate' : rec.id?.startsWith('ar') ? 'accessibility' : 'housing';
  const image = getInterventionImage(rec);
  const styles = {
    climate: { icon: <TreePine className="w-5 h-5" />, grad: 'from-emerald-900 to-emerald-950' },
    accessibility: { icon: <Bike className="w-5 h-5" />, grad: 'from-sky-900 to-sky-950' },
    housing: { icon: <Building2 className="w-5 h-5" />, grad: 'from-amber-900 to-amber-950' },
  }[cat];
  const topImpact = Object.entries(rec.impact || {}).sort((a, b) => b[1] - a[1])[0];

  return (
    <div className="rounded-lg overflow-hidden border border-slate-700/60 bg-slate-900">
      <div className={`h-[56px] ${image ? '' : `bg-gradient-to-br ${styles.grad} flex items-center justify-center text-slate-500`}`}>
        {image ? <img src={image} alt={rec.title} className="w-full h-full object-cover" /> : styles.icon}
      </div>
      <div className="p-1.5">
        <div className="text-[10px] font-semibold text-white leading-tight mb-0.5 line-clamp-2">{rec.title}</div>
        {topImpact && (
          <div className="text-[9px] text-emerald-400">+{topImpact[1]} {topImpact[0]}</div>
        )}
      </div>
    </div>
  );
}
