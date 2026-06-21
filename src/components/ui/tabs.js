import React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cn } from '../../lib/utils';

export const Tabs = TabsPrimitive.Root;

export function TabsList({ className, ...props }) {
  return (
    <TabsPrimitive.List
      className={cn('flex gap-1', className)}
      {...props}
    />
  );
}

export function TabsTrigger({ className, ...props }) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        'px-3 py-1.5 rounded-md text-xs font-medium transition-colors text-civic-text-muted hover:text-civic-text',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-civic-accent/40',
        'data-[state=active]:bg-civic-accent data-[state=active]:text-white',
        className
      )}
      {...props}
    />
  );
}

export function TabsContent({ className, ...props }) {
  return <TabsPrimitive.Content className={cn(className)} {...props} />;
}
