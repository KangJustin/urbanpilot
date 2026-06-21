import React from 'react';
import { ThermometerSun, Wind, Droplet, TreePine, Bus, Home } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import ProvenanceChip from './ui/provenance-chip';
import { fmtNumber, fmtPercent, fmtUsd, fmtTemperatureF, fmtValue } from '../utils/formatters';

// Civic-planning redesign Phase 3. A reasonable, decision-relevant subset (not every available
// field) of the verified data already returned by the Climate, Accessibility, and Housing
// agents — sourced from the exact same climateData/transitData/censusData props AgentCard.js
// already renders, just surfaced earlier in the workspace, before AI-generated scores/narrative.
// No new API calls; everything here is passed in from already-fetched analysis state.
//
// Provenance trace (see design-system/MASTER.md for the full writeup): femaFloodZone is a direct
// FEMA NFHL attribute; the AI-generated flood-risk/heat-risk classifications shown elsewhere in
// the header are a completely separate code path and are never labeled verified here.
function Metric({ icon: Icon, label, value, status, source }) {
  return (
    <div className="flex flex-col gap-1 py-2.5 px-3 bg-civic-surface-secondary border border-civic-border rounded-lg min-w-0">
      <div className="flex items-center gap-1.5 text-[11px] text-civic-text-muted">
        <Icon className="w-3.5 h-3.5 shrink-0" />
        <span className="truncate">{label}</span>
      </div>
      <div className="text-base font-semibold text-civic-text leading-tight truncate">{value}</div>
      <ProvenanceChip status={status} source={source} className="w-full whitespace-normal text-left leading-snug" />
    </div>
  );
}

export default function CurrentConditionsPanel({
  climateAvailable, climateData,
  transitAvailable, transitData,
  censusAvailable, censusData,
}) {
  const hasTemp = climateAvailable && climateData?.temperatureF != null;
  const hasAqi = climateAvailable && climateData?.usAqi != null;
  const hasFema = climateAvailable && climateData?.femaFloodZone != null;
  const hasCanopy = climateAvailable && climateData?.treeCanopyPercent != null;
  const hasTransit = transitAvailable && transitData?.nearbyStops800m != null;
  const hasRent = censusAvailable && censusData?.medianRent != null;

  return (
    <Card>
      <CardHeader><CardTitle as="h2">Verified Current Conditions</CardTitle></CardHeader>
      <CardContent>
        {/* Two columns, not a viewport-based 3-column breakpoint — this panel always renders
            inside the right sidebar's fixed-width (300px) column regardless of overall page
            viewport, so a Tailwind sm:/md: breakpoint here would key off the wrong dimension. */}
        <div className="grid grid-cols-2 gap-2">
          <Metric
            icon={ThermometerSun} label="Temperature"
            value={hasTemp ? fmtTemperatureF(climateData.temperatureF) : 'Not reported'}
            status={hasTemp ? 'verified' : 'unavailable'} source="Open-Meteo"
          />
          <Metric
            icon={Wind} label={<><abbr title="Air Quality Index" className="no-underline">AQI</abbr></>}
            value={hasAqi
              ? `${fmtNumber(climateData.usAqi)}${climateData?.aqiCategory ? ` (${climateData.aqiCategory})` : ''}`
              : 'Not reported'}
            status={hasAqi ? 'verified' : 'unavailable'} source="Open-Meteo"
          />
          <Metric
            icon={Droplet} label="FEMA Zone"
            value={hasFema ? fmtValue(climateData.femaFloodZone) : 'Not reported'}
            status={hasFema ? 'verified' : 'unavailable'} source="FEMA"
          />
          <Metric
            icon={TreePine} label="Tree Canopy"
            value={hasCanopy ? fmtPercent(climateData.treeCanopyPercent) : 'Not reported'}
            status={hasCanopy ? 'verified' : 'unavailable'} source="NLCD"
          />
          <Metric
            icon={Bus} label="Transit"
            value={hasTransit ? fmtNumber(transitData.nearbyStops800m) : 'Not reported'}
            status={hasTransit ? 'verified' : 'unavailable'} source="511"
          />
          <Metric
            icon={Home} label="Median Rent"
            value={hasRent ? fmtUsd(censusData.medianRent) : 'Not reported'}
            status={hasRent ? 'verified' : 'unavailable'} source="U.S. Census ACS"
          />
        </div>
      </CardContent>
    </Card>
  );
}
