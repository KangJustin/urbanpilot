import React from 'react';
import { Card, CardContent } from './ui/card';
import ProvenanceChip from './ui/provenance-chip';

function fmtUsd(n) {
  return n == null ? 'N/A' : `$${n.toLocaleString('en-US')}`;
}

// Climate verified fields can each be independently missing (Open-Meteo/FEMA/NLCD are three
// separate lookups) — never render a bare 0/null/undefined/NaN as if it were a real value.
function fmtField(value, { suffix = '', round = false } = {}) {
  if (value == null || Number.isNaN(value)) return 'Not reported';
  return `${round ? Math.round(value) : value}${suffix}`;
}

// One card per specialist agent. Shows real findings/summary only — "No score yet" /
// "Run an analysis..." placeholders instead of fabricated numbers when there's no real data.
// Civic-planning redesign Phase 4: restyled for the light palette, now rendered inside the
// Data & Methodology drawer (DataMethodologySection.js) instead of always-visible in the left
// sidebar — same props/contract, same fields, nothing removed.
export default function AgentCard({
  icon: Icon, iconBg, iconColor, scoreColor, label, score, bullets, summary,
  transitAvailable, transitData,
  censusAvailable, censusData,
  climateAvailable, climateData,
}) {
  return (
    <Card>
      <CardContent>
        <div className="flex items-center justify-between mb-2 gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${iconBg}`}>
              <Icon className={`w-4 h-4 ${iconColor}`} />
            </span>
            <div className="text-sm font-semibold text-civic-text leading-tight truncate">{label}</div>
          </div>
          {score != null ? (
            <span className={`text-base font-bold shrink-0 ${scoreColor}`}>
              {score}<span className="text-[10px] text-civic-text-muted font-normal">/100</span>
            </span>
          ) : (
            <span className="text-[10px] text-civic-text-muted shrink-0">No score yet</span>
          )}
        </div>
        {bullets?.length > 0 ? (
          <ul className="space-y-1">
            {bullets.slice(0, 4).map((b, i) => (
              <li key={i} className="text-[11px] text-civic-text leading-snug flex gap-1.5">
                <span className="text-civic-text-muted shrink-0">•</span>{b}
              </li>
            ))}
          </ul>
        ) : summary ? (
          <p className="text-[11px] text-civic-text leading-relaxed">{summary}</p>
        ) : (
          <p className="text-[11px] text-civic-text-muted italic">Run an analysis to see findings.</p>
        )}
        {transitAvailable === true && (
          <div className="mt-3 pt-3 border-t border-civic-border">
            <div className="flex items-center justify-between mb-1.5 gap-2">
              <span className="text-[11px] font-medium text-civic-text-muted">Verified Transit ({transitData?.source || '511 SF Bay Regional GTFS'})</span>
              <ProvenanceChip status="verified" source="511" className="shrink-0" />
            </div>
            <ul className="space-y-1">
              <li className="text-[11px] text-civic-text leading-snug flex gap-1.5">
                <span className="text-civic-text-muted shrink-0">•</span>Stops within 400m: {transitData?.nearbyStops400m}
              </li>
              <li className="text-[11px] text-civic-text leading-snug flex gap-1.5">
                <span className="text-civic-text-muted shrink-0">•</span>Stops within 800m: {transitData?.nearbyStops800m}
              </li>
              <li className="text-[11px] text-civic-text leading-snug flex gap-1.5">
                <span className="text-civic-text-muted shrink-0">•</span>Routes nearby: {transitData?.uniqueRoutes800m}
              </li>
              <li className="text-[11px] text-civic-text leading-snug flex gap-1.5">
                <span className="text-civic-text-muted shrink-0">•</span>Nearest transit hub: {transitData?.nearestHub?.name} ({transitData?.nearestHub?.distanceM}m)
              </li>
              <li className="text-[11px] text-civic-text leading-snug flex gap-1.5">
                <span className="text-civic-text-muted shrink-0">•</span>Transit modes: {transitData?.modes800m?.join(', ')}
              </li>
            </ul>
          </div>
        )}
        {censusAvailable === true && (
          <div className="mt-3 pt-3 border-t border-civic-border">
            <div className="flex items-center justify-between mb-1.5 gap-2">
              <span className="text-[11px] font-medium text-civic-text-muted">Verified Housing ({censusData?.source || 'ACS 5-Year'})</span>
              <ProvenanceChip status="verified" source="ACS" className="shrink-0" />
            </div>
            <ul className="space-y-1">
              <li className="text-[11px] text-civic-text leading-snug flex gap-1.5">
                <span className="text-civic-text-muted shrink-0">•</span>Median income: {fmtUsd(censusData?.medianIncome)}
              </li>
              <li className="text-[11px] text-civic-text leading-snug flex gap-1.5">
                <span className="text-civic-text-muted shrink-0">•</span>Median rent: {fmtUsd(censusData?.medianRent)}
              </li>
              <li className="text-[11px] text-civic-text leading-snug flex gap-1.5">
                <span className="text-civic-text-muted shrink-0">•</span>Vacancy rate: {censusData?.vacancyRate}%
              </li>
              <li className="text-[11px] text-civic-text leading-snug flex gap-1.5">
                <span className="text-civic-text-muted shrink-0">•</span>Renter %: {censusData?.renterPercent}%
              </li>
              <li className="text-[11px] text-civic-text leading-snug flex gap-1.5">
                <span className="text-civic-text-muted shrink-0">•</span>Housing units: {censusData?.housingUnits}
              </li>
            </ul>
          </div>
        )}
        {climateAvailable === true && (
          <div className="mt-3 pt-3 border-t border-civic-border">
            <div className="flex items-center justify-between mb-1.5 gap-2">
              <span className="text-[11px] font-medium text-civic-text-muted">Verified Climate Data</span>
              <ProvenanceChip status="verified" source="Open-Meteo" className="shrink-0" />
            </div>
            <ul className="space-y-1">
              <li className="text-[11px] text-civic-text leading-snug flex gap-1.5">
                <span className="text-civic-text-muted shrink-0">•</span>Temperature: {fmtField(climateData?.temperatureF, { suffix: '°F', round: true })}
              </li>
              <li className="text-[11px] text-civic-text leading-snug flex gap-1.5">
                <span className="text-civic-text-muted shrink-0">•</span>AQI: {fmtField(climateData?.usAqi)}{climateData?.usAqi != null && climateData?.aqiCategory ? ` (${climateData.aqiCategory})` : ''}
              </li>
              <li className="text-[11px] text-civic-text leading-snug flex gap-1.5">
                <span className="text-civic-text-muted shrink-0">•</span>FEMA Flood Zone: {fmtField(climateData?.femaFloodZone)}
              </li>
              <li className="text-[11px] text-civic-text leading-snug flex gap-1.5">
                <span className="text-civic-text-muted shrink-0">•</span>FEMA Flood Risk: {fmtField(climateData?.femaFloodRisk)}
              </li>
              <li className="text-[11px] text-civic-text leading-snug flex gap-1.5">
                <span className="text-civic-text-muted shrink-0">•</span>Tree Canopy: {fmtField(climateData?.treeCanopyPercent, { suffix: '%' })}
              </li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
