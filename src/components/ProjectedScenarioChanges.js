import React from 'react';
import { Camera, TrendingUp, TreePine, Building2, Bike, ThermometerSun, Droplet } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';

const METRIC_ICONS = [
  { match: /tree|canopy/i, icon: TreePine },
  { match: /hous|unit/i, icon: Building2 },
  { match: /transit|bike|bicycle|crossing/i, icon: Bike },
  { match: /heat|temperature|°f|°c/i, icon: ThermometerSun },
  { match: /flood|storm|water/i, icon: Droplet },
];

function metricIcon(text) {
  return METRIC_ICONS.find(m => m.match.test(text))?.icon || TrendingUp;
}

// Civic-planning redesign Phase 8: the projected-change stat strip that used to live below the
// map in MainMapPanel.js, moved into the spatial workspace as its own card. Same
// scenario.projectedChanges text and same presentPhotoSource-driven live-photo notice as before —
// both conditions are independent and preserved exactly; only the layout (2-column grid, dedicated
// card) and mount location changed.
export default function ProjectedScenarioChanges({ data, selectedScenario, presentPhotoSource }) {
  const scenario = data.scenarios?.[selectedScenario];
  if (!scenario) return null;

  return (
    <Card className="flex flex-col lg:min-h-[230px]">
      <CardHeader><CardTitle as="h2">Projected Scenario Changes</CardTitle></CardHeader>
      <CardContent className="flex-1 space-y-3">
        {scenario.projectedChanges?.length > 0 && (
          // Each change is a single AI/backend-authored sentence (not a structured
          // category/main/supporting triple) — content is unchanged, only the card grows to
          // fit it (items-start + no truncation) instead of clipping or center-squashing it.
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {scenario.projectedChanges.slice(0, 4).map((c, i) => {
              const MetricIcon = metricIcon(c);
              return (
                <div key={i} className="flex items-start gap-1.5 bg-civic-surface-secondary border border-civic-border rounded-lg px-3 py-2 min-h-[56px]">
                  <MetricIcon className="w-3 h-3 text-civic-accent shrink-0 mt-0.5" />
                  <span className="text-[11px] text-civic-text leading-snug">{c}</span>
                </div>
              );
            })}
          </div>
        )}

        {selectedScenario === '2026' && (
          <div className="flex items-center gap-1.5 text-[11px] text-civic-text-muted bg-civic-surface-secondary border border-civic-border rounded-lg px-3 py-2">
            <Camera className="w-3.5 h-3.5 text-civic-accent shrink-0" />
            Live {presentPhotoSource === 'google-street-view' ? 'Street View' : 'satellite'} photo — the present-day site, not AI-generated.
          </div>
        )}

        {!scenario.projectedChanges?.length && selectedScenario !== '2026' && (
          <p className="text-[11px] text-civic-text-muted italic">No projected changes available for this scenario.</p>
        )}
      </CardContent>
    </Card>
  );
}
