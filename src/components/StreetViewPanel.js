import React, { useState } from 'react';
import { ChevronDown, Eye } from 'lucide-react';
import PresentDayView from './PresentDayView';

// Civic-planning redesign Phase 5: a collapsible wrapper around PresentDayView. PresentDayView
// itself is NEVER conditionally mounted/unmounted here — it stays mounted at all times, exactly
// as instructed, with its Google Maps/Street View refs, effects, and teardown logic completely
// untouched. Collapsing is done with max-height + overflow-hidden (never display:none, which can
// report zero dimensions to Google Maps and break tile rendering on re-expand) — the underlying
// component's own container always retains real width.
//
// This is the one piece of new state introduced this phase, and it's UI-only (expand/collapse),
// scoped to this wrapper component rather than App.js — App.js's own hooks/state are untouched.
export default function StreetViewPanel({ location }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg border border-civic-border bg-civic-surface overflow-hidden">
      <button
        onClick={() => setExpanded(e => !e)}
        aria-expanded={expanded}
        aria-controls="street-view-panel-content"
        className="w-full flex items-center justify-between gap-2 px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-civic-accent/40">
        <span className="flex items-center gap-1.5 text-left">
          <Eye className="w-3.5 h-3.5 text-civic-text-muted shrink-0" />
          <span>
            <span className="block text-xs font-semibold text-civic-text">Street View</span>
            <span className="block text-[11px] text-civic-text-muted">Preview the selected location</span>
          </span>
        </span>
        <ChevronDown className={`w-4 h-4 text-civic-text-muted transition-transform shrink-0 ${expanded ? 'rotate-180' : ''}`} />
      </button>
      <div
        id="street-view-panel-content"
        className={`transition-[max-height] duration-300 overflow-hidden ${expanded ? 'max-h-[280px]' : 'max-h-0'}`}>
        <div className="border-t border-civic-border">
          <PresentDayView location={location} />
        </div>
      </div>
    </div>
  );
}
