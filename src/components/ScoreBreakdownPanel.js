import React from 'react';
import { ThermometerSun, Bike, Building2, BarChart3 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';

const ROWS = [
  { key: 'climateScore', label: 'Climate', icon: ThermometerSun, color: 'text-civic-accent' },
  { key: 'accessibilityScore', label: 'Accessibility', icon: Bike, color: 'text-civic-accessibility' },
  { key: 'housingScore', label: 'Housing', icon: Building2, color: 'text-civic-housing' },
];

function overallFor(scenario) {
  if (!scenario) return null;
  const vals = ROWS.map(r => scenario[r.key]).filter(v => v != null);
  if (vals.length !== ROWS.length) return null;
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}

// Real scenario scores only — shows an honest empty state rather than fabricated numbers
// when no analysis has produced scenarios yet. Overall is a derived average of the 3 real
// per-scenario scores (same formula coordinator.js already uses for current-conditions
// overallScore) — not a separately fabricated metric.
//
// IMPORTANT: `scenarios` must be the already-derived `scenariosForBreakdown` from App.js, never
// `data.scenarios` directly. App.js overrides its "2026" entry's three scores with the verified
// currentConditions scores (the same numbers shown in the AI Agents cards), because the vision
// agent independently estimates its own "2026" narrative score that can drift from those —
// without the override this panel's Current column could disagree with the AI Agents cards for
// the same site. That override lives entirely in App.js; this component has no awareness of it
// and must not reimplement, duplicate, or bypass it.
export default function ScoreBreakdownPanel({ scenarios, years, selectedYear }) {
  const hasData = years.some(y => scenarios?.[y]?.climateScore != null);

  return (
    <Card className="flex flex-col lg:min-h-[230px]">
      <CardHeader><CardTitle as="h2">Scenario Performance</CardTitle></CardHeader>
      <CardContent className="flex-1">
        {!hasData ? (
          <p className="text-[11px] text-civic-text-muted italic">Run an analysis to see scenario scores.</p>
        ) : (
          // Scrolls inside its own container on narrow viewports rather than ever causing
          // page-level horizontal overflow.
          <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[10px] text-civic-text-muted">
                <th scope="col" className="text-left font-normal"></th>
                {years.map(y => {
                  const selected = y === selectedYear;
                  return (
                    <th
                      key={y} scope="col" aria-current={selected ? 'true' : undefined}
                      className={`text-right font-medium pb-1.5 px-1.5 rounded-t ${selected ? 'text-civic-accent bg-civic-surface-secondary' : ''}`}>
                      {y === '2026' ? 'Current' : y}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {ROWS.map(({ key, label, icon: Icon, color }) => (
                <tr key={key}>
                  <th scope="row" className={`text-left font-medium py-1 ${color}`}>
                    <span className="flex items-center gap-1.5">
                      <Icon className="w-3.5 h-3.5" />
                      {label}
                    </span>
                  </th>
                  {years.map(y => (
                    <td key={y} className={`text-right py-1 px-1.5 ${y === selectedYear ? 'text-civic-text font-semibold bg-civic-surface-secondary' : 'text-civic-text-muted'}`}>
                      {scenarios?.[y]?.[key] ?? '—'}
                    </td>
                  ))}
                </tr>
              ))}
              <tr className="border-t border-civic-border">
                <th scope="row" className="text-left font-semibold text-civic-text py-1">
                  <span className="flex items-center gap-1.5">
                    <BarChart3 className="w-3.5 h-3.5" />
                    Overall
                  </span>
                </th>
                {years.map(y => {
                  const val = overallFor(scenarios?.[y]);
                  const selected = y === selectedYear;
                  return (
                    <td key={y} className={`text-right py-1 px-1.5 rounded-b font-semibold ${selected ? 'text-civic-accent bg-civic-surface-secondary' : 'text-civic-text'}`}>
                      {val ?? '—'}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
