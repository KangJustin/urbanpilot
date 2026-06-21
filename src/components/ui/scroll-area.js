import React from 'react';
import * as ScrollAreaPrimitive from '@radix-ui/react-scroll-area';
import { cn } from '../../lib/utils';

export function ScrollArea({ className, children, ...props }) {
  return (
    <ScrollAreaPrimitive.Root className={cn('relative overflow-hidden', className)} {...props}>
      <ScrollAreaPrimitive.Viewport className="h-full w-full">{children}</ScrollAreaPrimitive.Viewport>
      <ScrollAreaPrimitive.Scrollbar
        orientation="vertical"
        className="flex w-2 touch-none select-none p-0.5 bg-transparent">
        <ScrollAreaPrimitive.Thumb className="flex-1 rounded-full bg-slate-600" />
      </ScrollAreaPrimitive.Scrollbar>
    </ScrollAreaPrimitive.Root>
  );
}
