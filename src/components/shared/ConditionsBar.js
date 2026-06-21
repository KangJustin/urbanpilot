import React from 'react';
import StatBadge from './StatBadge';

export default function ConditionsBar({ conditions, aqiInfo, heatRisk, floodRisk, WeatherIcon }) {
  return (
    <div className="flex items-center gap-5 ml-auto shrink-0">
      {conditions?.temperatureF != null && (
        <div className="flex items-center gap-1.5 text-sm text-slate-200 shrink-0">
          <WeatherIcon className="w-4 h-4 text-amber-300" />
          {Math.round(conditions.temperatureF)}°F
        </div>
      )}
      {aqiInfo && (
        <StatBadge
          label="Air Quality"
          value={`${aqiInfo.label} · ${conditions.aqi} AQI`}
          color={aqiInfo.color}
        />
      )}
      {heatRisk && <StatBadge label="Heat Risk" value={heatRisk.label} color={heatRisk.color} />}
      {floodRisk && <StatBadge label="Flood Risk" value={floodRisk.label} color={floodRisk.color} />}
      <div className="up-live-badge">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-[11px] font-medium text-emerald-400">Live Data</span>
      </div>
    </div>
  );
}
