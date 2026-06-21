import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';

const ROWS = [
  { key: 'climateScore', label: 'Climate', color: 'text-emerald-400' },
  { key: 'accessibilityScore', label: 'Accessibility', color: 'text-violet-400' },
  { key: 'housingScore', label: 'Housing', color: 'text-amber-400' },
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
export default function ScoreBreakdownPanel({ scenarios, years, selectedYear }) {
  const hasData = years.some(y => scenarios?.[y]?.climateScore != null);

  return (
    <Card>
      <CardHeader><CardTitle>Scores Breakdown</CardTitle></CardHeader>
      <CardContent>
        {!hasData ? (
          <p className="text-[11px] text-slate-500 italic">Run an analysis to see scenario scores.</p>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[10px] text-slate-400">
                <td></td>
                {years.map(y => (
                  <td key={y} className={`text-right pb-1.5 px-1 rounded-t ${y === selectedYear ? 'text-emerald-400 font-semibold bg-emerald-950/40' : ''}`}>
                    {y === '2026' ? 'Current' : y}
                  </td>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROWS.map(({ key, label, color }) => (
                <tr key={key}>
                  <td className={`py-1 ${color}`}>{label}</td>
                  {years.map(y => (
                    <td key={y} className={`text-right py-1 px-1 ${y === selectedYear ? 'text-white font-semibold bg-emerald-950/40' : 'text-slate-400'}`}>
                      {scenarios?.[y]?.[key] ?? '—'}
                    </td>
                  ))}
                </tr>
              ))}
              <tr className="border-t border-slate-700/60">
                <td className="py-1 text-slate-200 font-semibold">Overall</td>
                {years.map(y => {
                  const val = overallFor(scenarios?.[y]);
                  return (
                    <td key={y} className={`text-right py-1 px-1 rounded-b font-semibold ${y === selectedYear ? 'text-emerald-300 bg-emerald-950/40' : 'text-slate-300'}`}>
                      {val ?? '—'}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}
