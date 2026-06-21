import React from 'react';
import { CheckCircle2, Loader2, Clock, AlertTriangle, ChevronDown } from 'lucide-react';

// Civic-planning redesign Phase 6: replaces the always-tall "Agent pipeline" list with a
// compact, user-facing status line. Uses the exact same agentStatuses/analysisState/
// analysisError state and scripted timing App.js already owns — nothing about when a state
// begins or ends has changed, only how it's summarized. Per-module detail (still simulated
// timing, not verified backend streaming) is available in a collapsed-by-default disclosure
// labeled "Analysis progress", never claimed as real-time backend status.
function ModuleRow({ label, status }) {
  return (
    <div className="flex items-center gap-2 py-1">
      {status === 'done' && <CheckCircle2 className="w-3.5 h-3.5 text-civic-accent shrink-0" />}
      {status === 'running' && <Loader2 className="w-3.5 h-3.5 text-civic-accessibility animate-spin shrink-0" />}
      {(status === 'queued' || !status) && <Clock className="w-3.5 h-3.5 text-civic-text-muted shrink-0" />}
      <span className="text-[11px] text-civic-text">{label}</span>
      <span className="ml-auto text-[10px] text-civic-text-muted">
        {status === 'done' ? 'Done' : status === 'running' ? 'In progress' : 'Queued'}
      </span>
    </div>
  );
}

export default function AnalysisStatusBar({ analysisState, analysisError, agentStatuses, agents }) {
  const moduleCount = agents.filter(a => a.id !== 'coordinator').length;

  if (analysisState === 'idle' && !analysisError) {
    return (
      <div className="flex items-center gap-2 text-[11px] text-civic-text-muted px-1">
        <Clock className="w-3.5 h-3.5 shrink-0" />
        Ready to analyze
      </div>
    );
  }

  if (analysisState === 'idle' && analysisError) {
    return (
      <div className="flex items-center gap-2 text-[11px] text-civic-risk-high px-1" role="alert">
        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
        Analysis failed · Try again
      </div>
    );
  }

  return (
    <details className="group rounded-lg border border-civic-border bg-civic-surface-secondary">
      <summary className="cursor-pointer list-none px-3 py-2 flex items-center justify-between gap-2 text-[11px] font-medium text-civic-text" aria-live="polite">
        <span className="flex items-center gap-1.5">
          {analysisState === 'running'
            ? <Loader2 className="w-3.5 h-3.5 text-civic-accessibility animate-spin shrink-0" />
            : <CheckCircle2 className="w-3.5 h-3.5 text-civic-accent shrink-0" />}
          {analysisState === 'running'
            ? 'Analyzing neighborhood data…'
            : `Analysis complete · ${moduleCount} modules evaluated`}
        </span>
        <ChevronDown className="w-3.5 h-3.5 text-civic-text-muted transition-transform group-open:rotate-180 shrink-0" />
      </summary>
      <div className="px-3 pb-2 pt-1 border-t border-civic-border">
        <div className="text-[10px] text-civic-text-muted mb-1">Analysis progress (simulated step timing, not live backend status)</div>
        {agents.map(a => (
          <ModuleRow key={a.id} label={a.label} status={agentStatuses[a.id]} />
        ))}
      </div>
    </details>
  );
}
