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

export function CardTitle({ className, ...props }) {
  return <div className={cn('text-xs font-semibold text-slate-300 tracking-wide', className)} {...props} />;
}

export function CardContent({ className, ...props }) {
  return <div className={cn('px-4 py-3', className)} {...props} />;
}
