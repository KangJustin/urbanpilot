import React from 'react';
import { cn } from '../../lib/utils';

export function Card({ className, ...props }) {
  return (
    <div className={cn('rounded-lg border border-slate-700/60 bg-slate-800/50', className)} {...props} />
  );
}

export function CardHeader({ className, ...props }) {
  return <div className={cn('px-4 py-3 border-b border-slate-700/40', className)} {...props} />;
}

// `as` defaults to 'div' (every existing call site keeps rendering a div, unchanged) — pass
// as="h2"/"h3" to render a real heading element for sections that need one in the semantic
// heading hierarchy (civic-planning redesign Phase 3).
export function CardTitle({ className, as: Tag = 'div', ...props }) {
  return <Tag className={cn('text-xs font-semibold text-slate-300 tracking-wide', className)} {...props} />;
}

export function CardContent({ className, ...props }) {
  return <div className={cn('px-4 py-3', className)} {...props} />;
}
