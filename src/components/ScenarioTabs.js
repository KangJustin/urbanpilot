import React from 'react';

// Top pill tabs for switching between the 3 years we have real data for, mockup-style.
export default function ScenarioTabs({ years, scenarios, selectedYear, onSelect }) {
  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] flex bg-slate-900/90 border border-slate-700 rounded-xl p-1 backdrop-blur-sm gap-1">
      {years.map(year => {
        const subtitle = scenarios?.[year]?.title?.split(':')[1]?.trim();
        const selected = selectedYear === year;
        return (
          <button
            key={year}
            onClick={() => onSelect(year)}
            className={`px-4 py-1.5 rounded-lg text-left transition-all ${
              selected ? 'bg-emerald-600 shadow-[0_0_14px_2px_rgba(16,185,129,0.45)]' : 'hover:bg-slate-800'
            }`}>
            <div className={`text-xs font-bold ${selected ? 'text-white' : 'text-slate-300'}`}>{year === '2026' ? 'Current' : year}</div>
            {subtitle && (
              <div className={`text-[10px] leading-tight ${selected ? 'text-emerald-100' : 'text-slate-500'}`}>{subtitle}</div>
            )}
          </button>
        );
      })}
    </div>
  );
}
