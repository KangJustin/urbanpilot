import React from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium border',
  {
    variants: {
      tone: {
        neutral: 'bg-slate-800 border-slate-700 text-slate-300',
        emerald: 'bg-emerald-900/40 border-emerald-700/50 text-emerald-400',
        amber: 'bg-amber-900/30 border-amber-700/50 text-amber-400',
        rose: 'bg-rose-900/30 border-rose-700/50 text-rose-400',
        sky: 'bg-sky-900/30 border-sky-700/50 text-sky-400',
        violet: 'bg-violet-900/30 border-violet-700/50 text-violet-400',
      },
    },
    defaultVariants: { tone: 'neutral' },
  }
);

export function Badge({ className, tone, ...props }) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
