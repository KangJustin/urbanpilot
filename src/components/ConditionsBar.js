import React from 'react';

function StatBadge({ label, value, color }) {
  return (
    <div className="text-right shrink-0">
      <div className="text-[10px] text-slate-500 leading-tight">{label}</div>
      <div className={`text-xs font-semibold leading-tight ${color}`}>{value}</div>
    </div>
  );
}

// Live weather/AQI + analysis-derived risk badges. Risk badges only render when there's a
// real value behind them (passed in as null otherwise) — never a placeholder number.
export default function ConditionsBar({ conditions, aqiInfo, heatRisk, floodRisk, WeatherIcon }) {
  return (
    <div className="flex items-center gap-5 shrink-0">
      {conditions?.temperatureF != null && (
        <div className="flex items-center gap-1.5 text-sm text-slate-200 shrink-0">
          <WeatherIcon className="w-4 h-4 text-amber-300" />
          {Math.round(conditions.temperatureF)}°F
        </div>
      )}
      {aqiInfo && (
        <StatBadge label="Air Quality" value={`${aqiInfo.label} · ${conditions.aqi} AQI`} color={aqiInfo.color} />
      )}
      {heatRisk && <StatBadge label="Heat Risk" value={heatRisk.label} color={heatRisk.color} />}
      {floodRisk && <StatBadge label="Flood Risk" value={floodRisk.label} color={floodRisk.color} />}
      <div className="relative flex items-center gap-1.5 bg-emerald-900/40 border border-emerald-700/50 rounded-full px-2.5 py-1 shrink-0 overflow-hidden">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
        <span className="text-[11px] font-medium text-emerald-400 relative z-10">Live Data</span>
        <span
          className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-400/10 to-transparent bg-[length:200%_100%] animate-shimmer"
          aria-hidden="true"
        />
      </div>
    </div>
  );
}
