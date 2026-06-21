import React from 'react';
import { ChevronDown, ThermometerSun, Bike, Building2, Compass } from 'lucide-react';
import AgentCard from './AgentCard';

// Civic-planning redesign Phase 4: the four full Agent Cards (summaries, findings, verified-data
// blocks) used to always render inline in the left sidebar. Moved here, collapsed by default —
// "internal agent architecture should remain accessible but visually secondary" — using a native
// <details>/<summary> disclosure, which gets full keyboard support (Enter/Space toggles, it's a
// real interactive element) with no custom JS. AgentCard's props/contract are completely
// unchanged; this only changes where the cards are mounted.
export default function DataMethodologySection({
  climateAgent, accessibilityAgent, housingAgent, urbanDesignAgent,
  overallScore, limitationsText,
}) {
  return (
    <details className="group rounded-lg border border-civic-border bg-civic-surface">
      <summary className="cursor-pointer list-none px-4 py-3 flex items-center justify-between gap-2 text-xs font-semibold text-civic-text tracking-wide rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-civic-accent/40">
        Data &amp; Methodology
        <ChevronDown className="w-4 h-4 text-civic-text-muted transition-transform group-open:rotate-180 shrink-0" />
      </summary>
      <div className="px-4 pb-4 pt-1 space-y-3 border-t border-civic-border">
        <AgentCard label="Climate Agent" icon={ThermometerSun} iconBg="bg-emerald-900/40" iconColor="text-emerald-400" scoreColor="text-civic-accent"
          score={climateAgent?.score} bullets={climateAgent?.findings} summary={climateAgent?.summary}
          climateAvailable={climateAgent?.climateAvailable} climateData={climateAgent?.climateData} />
        <AgentCard label="Accessibility Agent" icon={Bike} iconBg="bg-sky-900/40" iconColor="text-sky-400" scoreColor="text-civic-accessibility"
          score={accessibilityAgent?.score} bullets={accessibilityAgent?.findings} summary={accessibilityAgent?.summary}
          transitAvailable={accessibilityAgent?.transitAvailable} transitData={accessibilityAgent?.transitData} />
        <AgentCard label="Housing Agent" icon={Building2} iconBg="bg-amber-900/40" iconColor="text-amber-400" scoreColor="text-civic-housing"
          score={housingAgent?.score} bullets={housingAgent?.findings} summary={housingAgent?.summary}
          censusAvailable={housingAgent?.censusAvailable} censusData={housingAgent?.censusData} />
        <AgentCard label="Urban Design Agent" icon={Compass} iconBg="bg-violet-900/40" iconColor="text-violet-400" scoreColor="text-civic-text"
          score={null} bullets={urbanDesignAgent?.strategy?.immediate} summary={urbanDesignAgent?.summary} />

        {overallScore != null && (
          <div className="bg-civic-surface-secondary border border-civic-accent/40 rounded-lg px-4 py-3 flex items-center justify-between">
            <span className="text-xs text-civic-text-muted">Overall Score</span>
            <span className="text-lg font-bold text-civic-accent">{overallScore}<span className="text-xs text-civic-text-muted font-normal">/100</span></span>
          </div>
        )}

        {limitationsText && (
          <div className="text-[11px] text-civic-text-muted pb-1">{limitationsText}</div>
        )}
      </div>
    </details>
  );
}
