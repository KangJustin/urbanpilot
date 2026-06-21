import React from 'react';
import { ShieldCheck, BarChart3, AlertTriangle, ClipboardList, Construction } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';

const PREVIEW_ITEMS = [
  { icon: ShieldCheck, label: 'Verified current conditions' },
  { icon: BarChart3, label: 'Scenario performance' },
  { icon: AlertTriangle, label: 'Top risks' },
  { icon: ClipboardList, label: 'Planning recommendations' },
  { icon: Construction, label: 'Proposed interventions' },
];

// Civic-planning redesign Phase 7: the pre-analysis "analysis preview" column. Replaces the old
// blank dark placeholder with a light onboarding card — text and the semantic list only, never a
// fabricated score/risk/recommendation. Purely presentational; no props, no state.
export default function ReadyToAnalyzeCard() {
  return (
    <Card>
      <CardHeader><CardTitle as="h2">Ready to analyze</CardTitle></CardHeader>
      <CardContent>
        <p className="text-xs text-civic-text-muted leading-relaxed mb-3">
          UrbanPilot will evaluate the selected neighborhood across climate resilience,
          accessibility, housing, and urban design.
        </p>
        <ul className="space-y-1.5 mb-3">
          {PREVIEW_ITEMS.map(({ icon: Icon, label }) => (
            <li key={label} className="flex items-center gap-2 text-[11px] text-civic-text">
              <Icon className="w-3.5 h-3.5 text-civic-accent shrink-0" />
              {label}
            </li>
          ))}
        </ul>
        <p className="text-[11px] text-civic-text-muted leading-relaxed">
          Enter a planning goal, choose a target year, and run the analysis.
        </p>
      </CardContent>
    </Card>
  );
}
