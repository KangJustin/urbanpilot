import React from 'react';
import { CircleDot, AlertCircle, AlertTriangle } from 'lucide-react';
import ProvenanceChip from './ui/provenance-chip';

// Civic-planning redesign Phase 2: restyled to the light civic palette.
//
// heatRisk/floodRisk/aqiInfo arrive from planningHelpers.js exactly as before — their
// `label` (the actual classification, unchanged) is used; their bundled `color` (a
// dark-theme Tailwind class like `text-rose-400`) is intentionally NOT used here, since it
// doesn't have AA contrast on the new white surface. RISK_TONE below maps the unchanged label
// strings to civic-palette colors instead — getHeatRisk/getFloodRisk/severityLabel/aqiCategory
// in planningHelpers.js are not modified.
const RISK_TONE = {
  Low: { color: 'text-civic-risk-low', Icon: CircleDot },
  Moderate: { color: 'text-civic-risk-moderate', Icon: AlertCircle },
  'Unhealthy (SG)': { color: 'text-civic-risk-moderate', Icon: AlertCircle },
  High: { color: 'text-civic-risk-high', Icon: AlertTriangle },
  Unhealthy: { color: 'text-civic-risk-high', Icon: AlertTriangle },
  'Very Unhealthy': { color: 'text-civic-risk-critical', Icon: AlertTriangle },
  Good: { color: 'text-civic-accent', Icon: CircleDot },
};

function RiskStat({ label, displayValue, toneKey, provenanceStatus, provenanceSource }) {
  const tone = RISK_TONE[toneKey] || { color: 'text-civic-text', Icon: null };
  const { Icon } = tone;
  return (
    <div className="text-right shrink-0">
      <div className="text-[10px] text-civic-text-muted leading-tight">{label}</div>
      <div className={`flex items-center justify-end gap-1 text-xs font-semibold leading-tight ${tone.color}`}>
        {Icon && <Icon className="w-3 h-3" />}
        {displayValue}
      </div>
      <ProvenanceChip status={provenanceStatus} source={provenanceSource} className="mt-0.5" />
    </div>
  );
}

// Live weather/AQI + analysis-derived risk badges. Risk badges only render when there's a
// real value behind them (passed in as null otherwise) — never a placeholder number.
export default function ConditionsBar({ conditions, aqiInfo, heatRisk, floodRisk, WeatherIcon }) {
  return (
    <div className="flex items-center gap-4 sm:gap-5 shrink-0 flex-wrap">
      {conditions?.temperatureF != null && (
        <div className="flex flex-col items-end shrink-0">
          <div className="flex items-center gap-1.5 text-sm text-civic-text">
            <WeatherIcon className="w-4 h-4 text-civic-housing" />
            {Math.round(conditions.temperatureF)}°F
          </div>
          <ProvenanceChip status="verified" source="Open-Meteo" className="mt-0.5" />
        </div>
      )}
      {aqiInfo && (
        <RiskStat
          label="Air Quality" displayValue={`${aqiInfo.label} · ${conditions.aqi} AQI`}
          toneKey={aqiInfo.label} provenanceStatus="verified" provenanceSource="Open-Meteo"
        />
      )}
      {heatRisk && <RiskStat label="Heat Risk" displayValue={heatRisk.label} toneKey={heatRisk.label} provenanceStatus="ai" />}
      {floodRisk && <RiskStat label="Flood Risk" displayValue={floodRisk.label} toneKey={floodRisk.label} provenanceStatus="ai" />}
      <div className="flex items-center gap-1.5 bg-civic-surface-secondary border border-civic-border rounded-full px-2.5 py-1 shrink-0">
        <span className="w-1.5 h-1.5 rounded-full bg-civic-accent shrink-0" aria-hidden="true" />
        <span className="text-[11px] font-medium text-civic-text-muted">Live data</span>
      </div>
    </div>
  );
}
