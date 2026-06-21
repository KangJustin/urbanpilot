import React from 'react';
import { Copy, Check, Image, Loader2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import ReferenceImageInput from './ReferenceImageInput';

// Civic-planning redesign Phase 8: the "Visualize Proposed Streetscape" trigger, moved out of
// MainMapPanel.js into its own analysis-workspace card and restyled as a secondary outlined
// action instead of a dominant full-width filled button. Same handleGenerateVisualization
// handler, same gating condition (not the live-photo 2026 scenario, has a prompt, not already
// visualized), same loading/error state, same prompt-customization and reference-image controls
// as before — nothing about when or how generation happens changed.
export default function VisualizeStreetscapeAction({
  data, selectedScenario, visualizedImages, visualizingYear, visualizeError,
  handleGenerateVisualization, copied, setCopied,
  userVisionText, setUserVisionText, referenceImage, setReferenceImage, presentPhotoUrl,
}) {
  const scenario = data.scenarios?.[selectedScenario];
  if (!scenario) return null;

  const alreadyVisualized = !!(scenario.visualizationImage || visualizedImages[selectedScenario]);
  const canGenerate = selectedScenario !== '2026' && !!scenario.visualizationPrompt && !alreadyVisualized;

  return (
    <Card>
      <CardHeader><CardTitle as="h2">Visualize Proposed Streetscape</CardTitle></CardHeader>
      <CardContent>
        {!canGenerate ? (
          <p className="text-[11px] text-civic-text-muted italic">
            {selectedScenario === '2026'
              ? 'The current scenario uses a live photo instead of a generated visualization.'
              : alreadyVisualized
                ? 'A visualization has already been generated for this scenario.'
                : 'No visualization prompt is available for this scenario yet.'}
          </p>
        ) : (
          <>
            <button
              onClick={() => handleGenerateVisualization(scenario.visualizationPrompt, selectedScenario)}
              disabled={visualizingYear === selectedScenario}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold border border-civic-accent text-civic-accent hover:bg-civic-accent/10 transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-civic-accent/40">
              {visualizingYear === selectedScenario ? <Loader2 className="w-4 h-4 animate-spin" /> : <Image className="w-4 h-4" />}
              {visualizingYear === selectedScenario ? 'Visualizing streetscape…' : 'Visualize Proposed Streetscape'}
            </button>
            {visualizeError && <p className="text-xs text-civic-risk-high mt-2" role="alert">{visualizeError}</p>}
            <details className="mt-2.5">
              <summary className="text-[11px] font-medium text-civic-text-muted cursor-pointer">Customize prompt &amp; reference photo</summary>
              <div className="mt-2.5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] text-civic-text-muted">Midjourney prompt</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(scenario.visualizationPrompt);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-md bg-civic-surface border border-civic-border hover:bg-civic-surface-secondary text-civic-text-muted transition-colors">
                    {copied ? <Check className="w-3 h-3 text-civic-accent" /> : <Copy className="w-3 h-3" />}
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <p className="text-[11px] text-civic-text-muted leading-relaxed font-mono mb-2">{scenario.visualizationPrompt}</p>
                <textarea
                  value={userVisionText}
                  onChange={e => setUserVisionText(e.target.value)}
                  placeholder="Describe how you want this area to change (optional)…"
                  rows={2}
                  className="w-full bg-civic-surface border border-civic-border text-civic-text text-xs rounded-lg px-3 py-2 mb-2 resize-none placeholder-civic-text-muted focus:outline-none focus:ring-2 focus:ring-civic-accent/40 focus:border-civic-accent transition-colors"
                />
                <ReferenceImageInput referenceImage={referenceImage} onReferenceImageChange={setReferenceImage} autoPhotoUrl={presentPhotoUrl} />
              </div>
            </details>
          </>
        )}
      </CardContent>
    </Card>
  );
}
