import React from 'react';
import { Bike, Building2, TreePine } from 'lucide-react';
import { getRecommendationCategory } from '../../utils/planningHelpers';
import { getInterventionImage } from './interventionImages';

const CATEGORY_STYLES = {
  climate: { icon: TreePine, grad: 'from-emerald-900 to-emerald-950' },
  accessibility: { icon: Bike, grad: 'from-sky-900 to-sky-950' },
  housing: { icon: Building2, grad: 'from-amber-900 to-amber-950' },
};

export default function InterventionCard({ rec }) {
  const cat = getRecommendationCategory(rec);
  const image = getInterventionImage(rec);
  const styles = CATEGORY_STYLES[cat];
  const Icon = styles.icon;
  const topImpact = Object.entries(rec.impact || {}).sort((a, b) => b[1] - a[1])[0];

  return (
    <div className="up-card-compact shrink-0 w-[140px]">
      <div className={`h-[70px] ${image ? '' : `bg-gradient-to-br ${styles.grad} flex items-center justify-center text-slate-500`}`}>
        {image ? <img src={image} alt={rec.title} className="w-full h-full object-cover" /> : <Icon className="w-5 h-5" />}
      </div>
      <div className="p-2">
        <div className="text-[11px] font-semibold text-white leading-tight mb-1 line-clamp-2">{rec.title}</div>
        {topImpact && (
          <div className="text-[10px] text-emerald-400">+{topImpact[1]} {topImpact[0]}</div>
        )}
      </div>
    </div>
  );
}
