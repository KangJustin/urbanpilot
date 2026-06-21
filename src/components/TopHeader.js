import React from 'react';
import logo from '../assets/urbanpilot-logo.png';
import LocationSearch from './LocationSearch';
import ConditionsBar from './ConditionsBar';

// Civic-planning redesign: production logo asset approved and wired in (previously a Sparkles
// icon + text placeholder, per the redesign's "continue using the current logo, replace
// separately once a final asset exists" instruction across Phases 2-6).
export default function TopHeader({
  siteName, areaKm2, population, onLocationSelected,
  conditions, aqiInfo, floodRisk, WeatherIcon,
}) {
  return (
    <header className="shrink-0 border-b border-civic-border bg-civic-surface px-4 sm:px-5 py-3 flex flex-wrap items-center gap-3 sm:gap-5">
      <div className="flex items-center shrink-0">
        <img src={logo} alt="UrbanPilot" className="h-9 w-auto" />
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
        <ConditionsBar conditions={conditions} aqiInfo={aqiInfo} floodRisk={floodRisk} WeatherIcon={WeatherIcon} />
      </div>
    </header>
  );
}
