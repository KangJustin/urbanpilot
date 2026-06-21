import React from 'react';
import { Sparkles } from 'lucide-react';

function ScenarioScoreMini({ label, score }) {
  return (
    <div className="text-center">
      <div className="text-[13px] font-bold text-white leading-tight">{score}</div>
      <div className="text-[9px] text-slate-500 leading-tight">{label}</div>
    </div>
  );
}

export default function ScenarioCard({ year, scenario, image, selected, onSelect }) {
  if (!scenario) return null;
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`shrink-0 w-[150px] text-left rounded-lg overflow-hidden border transition-colors ${
        selected ? 'border-emerald-500 ring-1 ring-emerald-500/50' : 'border-slate-700/60 hover:border-slate-600'
      }`}
    >
      <div className="h-[84px] bg-slate-800">
        {image ? (
          <img src={image} alt={`${year} visualization`} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-600">
            <Sparkles className="w-5 h-5" />
          </div>
        )}
      </div>
      <div className="p-2 bg-slate-800/60">
        <div className="text-xs font-bold text-white">{year}</div>
        <div className="text-[10px] text-slate-500 mb-1.5 truncate">
          {scenario.title?.replace(`${year}: `, '').replace(`Berkeley ${year}: `, '')}
        </div>
        <div className="grid grid-cols-3 gap-1">
          <ScenarioScoreMini label="Climate" score={scenario.climateScore} />
          <ScenarioScoreMini label="Access" score={scenario.accessibilityScore} />
          <ScenarioScoreMini label="Housing" score={scenario.housingScore} />
        </div>
      </div>
    </button>
  );
}
