import React from 'react';
import { Sparkles } from 'lucide-react';
import LocationSearch from './LocationSearch';
import ConditionsBar from './ConditionsBar';

// Civic-planning redesign Phase 2: restyled to the light civic palette. Logo mark (Sparkles)
// kept as-is per redesign instructions — a permanent replacement comes later, separately, once a
// production-ready asset exists. Props/behavior unchanged from the previous version.
export default function TopHeader({
  siteName, areaKm2, population, onLocationSelected,
  conditions, aqiInfo, heatRisk, floodRisk, WeatherIcon,
}) {
  return (
    <header className="shrink-0 border-b border-civic-border bg-civic-surface px-4 sm:px-5 py-3 flex flex-wrap items-center gap-3 sm:gap-5">
      <div className="flex items-center gap-2 shrink-0">
        <Sparkles className="w-5 h-5 text-civic-accent" />
        <span className="text-sm font-bold text-civic-text tracking-tight">UrbanPilot</span>
      </div>
      <div className="hidden sm:block w-px h-8 bg-civic-border shrink-0" />
      <div className="shrink-0 min-w-[120px]">
        <div className="text-sm font-bold text-civic-text leading-tight truncate max-w-[220px]">{siteName}</div>
        <div className="text-[11px] text-civic-text-muted leading-tight">
          {areaKm2 != null && `Area: ${areaKm2} km²`}
          {areaKm2 != null && population != null && ' · '}
          {population != null && `Population: ${population.toLocaleString()}`}
        </div>
      </div>

      <div className="w-full sm:w-72 order-3 sm:order-none shrink-0">
        <LocationSearch onLocationSelected={onLocationSelected} compact />
      </div>

      <div className="sm:ml-auto shrink-0">
        <ConditionsBar conditions={conditions} aqiInfo={aqiInfo} heatRisk={heatRisk} floodRisk={floodRisk} WeatherIcon={WeatherIcon} />
      </div>
    </header>
  );
}
