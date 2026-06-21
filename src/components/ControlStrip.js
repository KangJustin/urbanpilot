import React from 'react';
import { Loader2 } from 'lucide-react';

// Civic-planning redesign Phase 2: presentational extraction of the planning-goal / target-year /
// Analyze block that used to live inline inside App.js's left sidebar. Moved here verbatim as a
// horizontal control strip below the header, per the approved Concept A hierarchy — every value,
// setter, and handler below is passed through from App.js unchanged; no state, no handler bodies,
// and no request payload were touched. The only intentional widget change is the planning-goal
// field's `rows` (3 -> 2), a purely cosmetic textarea-height adjustment for the shorter strip.
//
// Civic-planning redesign Phase 7: added a `variant` prop. 'strip' (default) is the original
// compact horizontal bar used once results exist. 'panel' is the same component rendered as the
// vertical onboarding block that fills the pre-analysis left column — adds the heading, supporting
// text, suggested-goal chips (moved here from App.js, same setGoal(chip) handler), and workflow
// hint. Nothing about goal/year/analyze state, handlers, or disabled logic differs between variants
// — only layout and the additional read-only onboarding copy.
export default function ControlStrip({
  goal, setGoal, years, selectedScenario, selectScenario,
  onAnalyze, analyzing, analyzeDisabled, analysisError,
  variant = 'strip', goalChips = [],
}) {
  const isPanel = variant === 'panel';

  return (
    <div className={isPanel
      ? 'flex flex-col gap-4'
      : 'shrink-0 border-b border-civic-border bg-civic-surface px-4 sm:px-5 py-3 flex flex-col sm:flex-row items-stretch sm:items-end gap-3'}>
      <div className={isPanel ? '' : 'flex-1 min-w-0'}>
        {isPanel && (
          <>
            <h2 id="planning-goal-heading" className="text-base font-bold text-civic-text mb-1">What do you want to improve?</h2>
            <p className="text-xs text-civic-text-muted mb-3">Describe a planning goal for the selected neighborhood.</p>
          </>
        )}
        <label
          htmlFor="planning-goal"
          className={isPanel ? 'sr-only' : 'block text-xs text-civic-text-muted mb-1.5'}>
          {isPanel ? 'What do you want to improve?' : 'Planning goal'}
        </label>
        <textarea
          id="planning-goal"
          aria-labelledby={isPanel ? 'planning-goal-heading' : undefined}
          value={goal}
          onChange={e => setGoal(e.target.value)}
          placeholder="e.g. Add housing near transit while reducing heat and improving biking"
          rows={isPanel ? 3 : 2}
          className="w-full bg-civic-surface-secondary border border-civic-border text-civic-text text-sm rounded-lg px-3 py-2 resize-none placeholder-civic-text-muted focus:outline-none focus:ring-2 focus:ring-civic-accent/40 focus:border-civic-accent transition-colors"
        />
        {isPanel && goalChips.length > 0 && (
          <div className="mt-3">
            <div className="text-xs text-civic-text-muted mb-1.5">Try a suggested goal</div>
            <div className="flex flex-wrap gap-1.5">
              {goalChips.map(chip => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => setGoal(chip)}
                  className="text-[11px] px-2.5 py-1.5 rounded-full bg-civic-surface-secondary hover:bg-civic-border/40 border border-civic-border text-civic-text transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-civic-accent/40">
                  {chip}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className={isPanel ? '' : 'shrink-0'}>
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

      <div className={isPanel ? '' : 'shrink-0 w-full sm:w-auto'}>
        <button
          onClick={onAnalyze}
          disabled={analyzeDisabled}
          aria-busy={analyzing}
          className={`${isPanel ? 'w-full' : 'w-full sm:w-auto'} px-6 py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-civic-accent hover:bg-civic-accent/90 text-white flex items-center justify-center gap-2`}>
          {analyzing && <Loader2 className="w-4 h-4 animate-spin" />}
          {analyzing ? 'Analyzing…' : 'Analyze'}
        </button>
      </div>

      {isPanel && (
        <p className="text-[11px] text-civic-text-muted leading-relaxed">
          1. Select location → 2. Define goal → 3. Choose year → 4. Analyze
        </p>
      )}

      {analysisError && (
        <div className={`${isPanel ? '' : 'w-full'} text-xs text-civic-risk-high bg-civic-surface-secondary border border-civic-border rounded-lg px-3 py-2`} role="alert">
          {analysisError}
        </div>
      )}
    </div>
  );
}
