import React from 'react';
import { Card, CardContent } from './ui/card';

// One card per specialist agent. Shows real findings/summary only — "No score yet" /
// "Run an analysis..." placeholders instead of fabricated numbers when there's no real data.
export default function AgentCard({
  icon: Icon, iconBg, iconColor, scoreColor, label, score, bullets, summary,
  transitAvailable, transitData,
}) {
  return (
    <Card>
      <CardContent>
        <div className="flex items-center justify-between mb-2 gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${iconBg}`}>
              <Icon className={`w-4 h-4 ${iconColor}`} />
            </span>
            <div className="text-sm font-semibold text-white leading-tight truncate">{label}</div>
          </div>
          {score != null ? (
            <span className={`text-base font-bold shrink-0 ${scoreColor}`}>
              {score}<span className="text-[10px] text-slate-400 font-normal">/100</span>
            </span>
          ) : (
            <span className="text-[10px] text-slate-500 shrink-0">No score yet</span>
          )}
        </div>
        {bullets?.length > 0 ? (
          <ul className="space-y-1">
            {bullets.slice(0, 4).map((b, i) => (
              <li key={i} className="text-[11px] text-slate-300 leading-snug flex gap-1.5">
                <span className="text-slate-500 shrink-0">•</span>{b}
              </li>
            ))}
          </ul>
        ) : summary ? (
          <p className="text-[11px] text-slate-300 leading-relaxed">{summary}</p>
        ) : (
          <p className="text-[11px] text-slate-500 italic">Run an analysis to see findings.</p>
        )}
        {transitAvailable === true && (
          <div className="mt-3 pt-3 border-t border-slate-700/50">
            <div className="flex items-center justify-between mb-1.5 gap-2">
              <span className="text-[11px] font-medium text-slate-400">Verified Transit ({transitData?.source || '511 SF Bay Regional GTFS'})</span>
              <span className="inline-flex items-center rounded-full border border-emerald-700/40 bg-emerald-950/30 px-2 py-0.5 text-[10px] font-medium text-emerald-400 shrink-0">
                Verified Data
              </span>
            </div>
            <ul className="space-y-1">
              <li className="text-[11px] text-slate-300 leading-snug flex gap-1.5">
                <span className="text-slate-500 shrink-0">•</span>Stops within 400m: {transitData?.nearbyStops400m}
              </li>
              <li className="text-[11px] text-slate-300 leading-snug flex gap-1.5">
                <span className="text-slate-500 shrink-0">•</span>Stops within 800m: {transitData?.nearbyStops800m}
              </li>
              <li className="text-[11px] text-slate-300 leading-snug flex gap-1.5">
                <span className="text-slate-500 shrink-0">•</span>Routes nearby: {transitData?.uniqueRoutes800m}
              </li>
              <li className="text-[11px] text-slate-300 leading-snug flex gap-1.5">
                <span className="text-slate-500 shrink-0">•</span>Nearest hub: {transitData?.nearestHub?.name} ({transitData?.nearestHub?.distanceM}m)
              </li>
              <li className="text-[11px] text-slate-300 leading-snug flex gap-1.5">
                <span className="text-slate-500 shrink-0">•</span>Modes: {transitData?.modes800m?.join(', ')}
              </li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
