import React from 'react';
import { Sparkles } from 'lucide-react';
import LocationSearch from './LocationSearch';
import ConditionsBar from './ConditionsBar';

export default function TopHeader({
  siteName, areaKm2, population, onLocationSelected,
  conditions, aqiInfo, heatRisk, floodRisk, WeatherIcon,
}) {
  return (
    <div className="shrink-0 border-b border-slate-800 bg-slate-900 px-5 py-3 flex items-center gap-5">
      <div className="flex items-center gap-2 shrink-0">
        <Sparkles className="w-5 h-5 text-emerald-400" />
        <span className="text-sm font-bold text-white tracking-tight">UrbanPilot</span>
      </div>
      <div className="w-px h-8 bg-slate-700 shrink-0" />
      <div className="shrink-0 min-w-[160px]">
        <div className="text-sm font-bold text-white leading-tight truncate max-w-[220px]">{siteName}</div>
        <div className="text-[11px] text-slate-500 leading-tight">
          {areaKm2 != null && `Area: ${areaKm2} km²`}
          {areaKm2 != null && population != null && ' · '}
          {population != null && `Population: ${population.toLocaleString()}`}
        </div>
      </div>

      <div className="w-72 shrink-0">
        <LocationSearch onLocationSelected={onLocationSelected} compact />
      </div>

      <div className="ml-auto shrink-0">
        <ConditionsBar conditions={conditions} aqiInfo={aqiInfo} heatRisk={heatRisk} floodRisk={floodRisk} WeatherIcon={WeatherIcon} />
      </div>
    </div>
  );
}
