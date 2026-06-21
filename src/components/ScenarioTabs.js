import React from 'react';

// Floating year selector over the map. Same years/selectedYear/onSelect contract as before,
// shares the exact same selectedScenario state and selectScenario handler as the Phase 2
// ControlStrip's segmented Target Year control — already synchronized, no new state. Civic-
// planning redesign Phase 5: restyled to match ControlStrip's segmented-control treatment
// (light surface, no glow), and visually secondary (smaller, less prominent than the primary
// control strip) since the same control already exists there.
export default function ScenarioTabs({ years, selectedYear, onSelect }) {
  return (
    <div
      role="group" aria-label="Target year"
      className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] flex bg-civic-surface/95 border border-civic-border rounded-lg shadow-civic-sm p-0.5 gap-0.5">
      {years.map(year => {
        const selected = selectedYear === year;
        return (
          <button
            key={year}
            type="button"
            aria-pressed={selected}
            onClick={() => onSelect(year)}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-civic-accent/40 ${
              selected ? 'bg-civic-accent text-white' : 'text-civic-text-muted hover:text-civic-text'
            }`}>
            {year === '2026' ? 'Current' : year}
          </button>
        );
      })}
    </div>
  );
}
