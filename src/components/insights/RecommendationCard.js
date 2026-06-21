import React from 'react';
import { Bike, Building2, TreePine } from 'lucide-react';
import { COST_COLORS, getRecommendationCategory } from '../../utils/planningHelpers';

const CATEGORY_STYLES = {
  climate: { border: 'border-emerald-900', accent: 'text-emerald-400', icon: TreePine },
  accessibility: { border: 'border-sky-900', accent: 'text-sky-400', icon: Bike },
  housing: { border: 'border-amber-900', accent: 'text-amber-400', icon: Building2 },
};

export default function RecommendationCard({ rec }) {
  const cat = getRecommendationCategory(rec);
  const styles = CATEGORY_STYLES[cat] || { border: 'border-slate-700', accent: 'text-slate-400', icon: null };
  const Icon = styles.icon;

  return (
    <div className={`up-card border ${styles.border} p-3 mb-2`}>
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-1.5">
          {Icon && (
            <span className={styles.accent}>
              <Icon className="w-3 h-3" />
            </span>
          )}
          <span className="text-sm font-medium text-white">{rec.title}</span>
        </div>
        <span className={`text-xs shrink-0 ${COST_COLORS[rec.cost] || 'text-slate-400'}`}>{rec.cost}</span>
      </div>
      <p className="text-xs text-slate-400 leading-relaxed mb-2">{rec.description}</p>
      {rec.timeline && (
        <span className="text-xs text-slate-600 bg-slate-800 px-2 py-0.5 rounded-full">
          {rec.timeline.replace('_', ' ')}
        </span>
      )}
    </div>
  );
}
