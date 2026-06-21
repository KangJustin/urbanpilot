import React from 'react';
import { Card, CardHeader, CardContent } from './ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import RisksPanel from './RisksPanel';
import RecommendationsPanel from './RecommendationsPanel';
import InterventionsPanel from './InterventionsPanel';

// Civic-planning redesign Phase 4: Risks/Recommendations/Interventions used to render as three
// long stacked sections simultaneously; now a single tabbed panel (Radix Tabs — full WAI-ARIA
// keyboard support: arrow keys move focus, Home/End jump to first/last, the active tab is
// activated automatically per the standard tabs pattern). No data, sorting, or severity logic
// changed — RisksPanel/RecommendationsPanel/InterventionsPanel still own all of that exactly as
// before; they just render bare content now instead of each wrapping their own Card.
export default function PlanningFindings({ risks, recommendations }) {
  return (
    <Card>
      <Tabs defaultValue="risks">
        <CardHeader className="pb-0">
          <TabsList aria-label="Planning findings">
            <TabsTrigger value="risks">Risks</TabsTrigger>
            <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
            <TabsTrigger value="interventions">Interventions</TabsTrigger>
          </TabsList>
        </CardHeader>
        <CardContent>
          <TabsContent value="risks">
            <RisksPanel risks={risks} />
          </TabsContent>
          <TabsContent value="recommendations">
            <RecommendationsPanel recommendations={recommendations} />
          </TabsContent>
          <TabsContent value="interventions">
            <InterventionsPanel recommendations={recommendations} />
          </TabsContent>
        </CardContent>
      </Tabs>
    </Card>
  );
}
