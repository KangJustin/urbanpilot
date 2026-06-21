import React from 'react';
import { Sparkles } from 'lucide-react';
import ConditionsBar from '../shared/ConditionsBar';

export default function TopHeader({ site, conditions, aqiInfo, heatRisk, floodRisk, WeatherIcon }) {
  return (
    <header className="shrink-0 border-b border-up-border bg-up-charcoal px-5 py-3 flex items-center gap-5 overflow-x-auto">
      <div className="flex items-center gap-2 shrink-0">
        <Sparkles className="w-5 h-5 text-up-accent" />
        <span className="up-heading">UrbanPilot</span>
      </div>
      <div className="w-px h-8 bg-slate-700 shrink-0" />
      <div className="shrink-0">
        <div className="text-sm font-bold text-white leading-tight">{site?.name}</div>
        <div className="text-[11px] text-slate-500 leading-tight">
          {site?.areaKm2 != null && `Area: ${site.areaKm2} km²`}
          {site?.areaKm2 != null && site?.population != null && ' · '}
          {site?.population != null && `Population: ${site.population.toLocaleString()}`}
        </div>
      </div>

      <ConditionsBar
        conditions={conditions}
        aqiInfo={aqiInfo}
        heatRisk={heatRisk}
        floodRisk={floodRisk}
        WeatherIcon={WeatherIcon}
      />
    </header>
  );
}
