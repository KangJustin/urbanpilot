import React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { cn } from '../../lib/utils';

export const TooltipProvider = TooltipPrimitive.Provider;
export const Tooltip = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;

export function TooltipContent({ className, sideOffset = 4, ...props }) {
  return (
    <TooltipPrimitive.Content
      sideOffset={sideOffset}
      className={cn(
        'z-50 overflow-hidden rounded-md border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-[11px] text-slate-200 shadow-md',
        'animate-in fade-in-0 zoom-in-95',
        className
      )}
      {...props}
    />
  );
}
