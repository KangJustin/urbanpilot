import React from 'react';
import { CheckCircle2, Loader2, Clock } from 'lucide-react';

export default function AgentRow({ label, status }) {
  return (
    <div className="flex items-center gap-2.5 py-1.5">
      {status === 'done' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
      {status === 'running' && <Loader2 className="w-4 h-4 text-sky-400 animate-spin shrink-0" />}
      {(status === 'queued' || !status) && <Clock className="w-4 h-4 text-slate-600 shrink-0" />}
      <span className={`text-sm ${status === 'running' ? 'text-sky-300' : status === 'done' ? 'text-white' : 'text-slate-500'}`}>
        {label}
      </span>
      {status === 'running' && <span className="text-xs text-sky-400 ml-auto animate-pulse">Analyzing…</span>}
      {status === 'done' && <span className="text-xs text-emerald-500 ml-auto">Done</span>}
    </div>
  );
}
