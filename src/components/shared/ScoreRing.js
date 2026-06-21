import React from 'react';

export default function ScoreRing({ label, score, icon: Icon, color, stroke }) {
  const r = 22;
  const circ = 2 * Math.PI * r;
  const filled = (score / 100) * circ;
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative w-14 h-14">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 56 56">
          <circle cx="28" cy="28" r={r} fill="none" stroke="#1e293b" strokeWidth="5" />
          <circle
            cx="28"
            cy="28"
            r={r}
            fill="none"
            stroke={stroke}
            strokeWidth="5"
            strokeDasharray={`${filled} ${circ}`}
            strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 0.8s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-sm font-bold ${color}`}>{score}</span>
        </div>
      </div>
      <div className={`flex items-center gap-1 text-xs ${color} opacity-70`}>
        <Icon className="w-3 h-3" />
        {label}
      </div>
    </div>
  );
}
