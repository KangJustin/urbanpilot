import React from 'react';
import { cn } from '../../lib/utils';

// Civic-planning redesign Phase 6: updated the shared default from the original dark theme to
// the civic light palette. Confirmed safe — every still-live usage of Card/CardHeader/CardTitle
// (AgentCard, PlanningFindings, CurrentConditionsPanel, ScoreBreakdownPanel) renders these bare,
// with no className override, so all 4 were silently still dark until this fix (the kind of
// Phase 1-5 visual inconsistency this phase exists to catch). The only other references to the
// old dark values are in the orphaned layout/analysis/insights/interventions/shared/scenarios/map
// tree, which isn't imported or activated and is left untouched.
export function Card({ className, ...props }) {
  return (
    <div className={cn('rounded-lg border border-civic-border bg-civic-surface shadow-civic-sm', className)} {...props} />
  );
}

export function CardHeader({ className, ...props }) {
  return <div className={cn('px-4 py-3 border-b border-civic-border', className)} {...props} />;
}

// `as` defaults to 'div' (every existing call site keeps rendering a div, unchanged) — pass
// as="h2"/"h3" to render a real heading element for sections that need one in the semantic
// heading hierarchy (civic-planning redesign Phase 3).
export function CardTitle({ className, as: Tag = 'div', ...props }) {
  return <Tag className={cn('text-xs font-semibold text-civic-text tracking-wide', className)} {...props} />;
}

export function CardContent({ className, ...props }) {
  return <div className={cn('px-4 py-3', className)} {...props} />;
}
