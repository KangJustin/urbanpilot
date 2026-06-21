import React from 'react';
import { Loader2 } from 'lucide-react';

// Civic-planning redesign Phase 2: presentational extraction of the planning-goal / target-year /
// Analyze block that used to live inline inside App.js's left sidebar. Moved here verbatim as a
// horizontal control strip below the header, per the approved Concept A hierarchy — every value,
// setter, and handler below is passed through from App.js unchanged; no state, no handler bodies,
// and no request payload were touched. The only intentional widget change is the planning-goal
// field's `rows` (3 -> 2), a purely cosmetic textarea-height adjustment for the shorter strip.
export default function ControlStrip({
  goal, setGoal, years, selectedScenario, selectScenario,
  onAnalyze, analyzing, analyzeDisabled, analysisError,
}) {
  return (
    <div className="shrink-0 border-b border-civic-border bg-civic-surface px-4 sm:px-5 py-3 flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
      <div className="flex-1 min-w-0">
        <label htmlFor="planning-goal" className="block text-xs text-civic-text-muted mb-1.5">Planning goal</label>
        <textarea
          id="planning-goal"
          value={goal}
          onChange={e => setGoal(e.target.value)}
          placeholder="e.g. Add housing near transit while reducing heat and improving biking"
          rows={2}
          className="w-full bg-civic-surface-secondary border border-civic-border text-civic-text text-sm rounded-lg px-3 py-2 resize-none placeholder-civic-text-muted focus:outline-none focus:ring-2 focus:ring-civic-accent/40 focus:border-civic-accent transition-colors"
        />
      </div>

      <div className="shrink-0">
        <span className="block text-xs text-civic-text-muted mb-1.5">Target year</span>
        <div role="group" aria-label="Target year" className="inline-flex bg-civic-surface-secondary border border-civic-border rounded-lg p-0.5 gap-0.5">
          {years.map(year => {
            const selected = selectedScenario === year;
            return (
              <button
                key={year}
                type="button"
                aria-pressed={selected}
                onClick={() => selectScenario(year)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-civic-accent/40 ${
                  selected ? 'bg-civic-accent text-white' : 'text-civic-text-muted hover:text-civic-text'
                }`}>
                {year === '2026' ? 'Current' : year}
              </button>
            );
          })}
        </div>
      </div>

      <div className="shrink-0 w-full sm:w-auto">
        <button
          onClick={onAnalyze}
          disabled={analyzeDisabled}
          aria-busy={analyzing}
          className="w-full sm:w-auto px-6 py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-civic-accent hover:bg-civic-accent/90 text-white flex items-center justify-center gap-2">
          {analyzing && <Loader2 className="w-4 h-4 animate-spin" />}
          {analyzing ? 'Analyzing…' : 'Analyze'}
        </button>
      </div>

      {analysisError && (
        <div className="w-full text-xs text-civic-risk-high bg-civic-surface-secondary border border-civic-border rounded-lg px-3 py-2" role="alert">
          {analysisError}
        </div>
      )}
    </div>
  );
}
