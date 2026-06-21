import React from 'react';

export default function AppShell({ header, sidebar, children }) {
  return (
    <div className="h-screen flex flex-col overflow-hidden bg-up-navy">
      {header}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {sidebar}
        {children}
      </div>
    </div>
  );
}
