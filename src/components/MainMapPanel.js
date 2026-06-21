import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, AttributionControl, useMap } from 'react-leaflet';
import L from 'leaflet';
import {
  Camera, Copy, Check, Image, Loader2, TrendingUp, ZoomIn, ZoomOut, LocateFixed,
  TreePine, Building2, Bike, ThermometerSun, Droplet,
} from 'lucide-react';
import ScenarioTabs from './ScenarioTabs';
import ReferenceImageInput from './ReferenceImageInput';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Civic-planning redesign Phase 5: the pulsing ring was purely decorative (no state it tracked),
// removed per "avoid excessive pulsing". A static civic-green dot with a white border ring is a
// non-color-only visual form (defined border + center point), clearly visible on the light
// basemap at normal zoom without any glow/animation.
const ACTIVE_SITE_ICON = L.divIcon({
  html: `<div style="position:relative;width:18px;height:18px;">
    <div style="position:absolute;inset:0;border-radius:50%;background:#167A59;border:3px solid white;box-shadow:0 1px 3px rgba(23,32,28,0.3);"></div>
  </div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
  className: '',
});

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

// react-leaflet's MapContainer center/zoom props only apply on first mount; recenter
// explicitly whenever the selected location changes.
function RecenterMap({ center, zoom }) {
  const map = useMap();
  React.useEffect(() => { map.setView(center, zoom); }, [center, map, zoom]);
  return null;
}

// Civic-planning redesign Phase 5: restyled to a restrained light-surface toolbar. Zoom/recenter
// still call the exact same real Leaflet methods as before (map.zoomIn/zoomOut/setView) — only
// the visual treatment changed. The old Layers/Maximize buttons had no handler at all (pure
// decoration implying functionality that didn't exist) and are removed entirely rather than
// just restyled, per "do not display buttons that imply unavailable functionality".
function MapControls({ center, zoom }) {
  const map = useMap();
  return (
    <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-1 bg-civic-surface border border-civic-border rounded-xl p-1 shadow-civic-sm">
      <button
        onClick={() => map.zoomIn()} title="Zoom in" aria-label="Zoom in"
        className="w-8 h-8 flex items-center justify-center rounded-lg text-civic-text-muted hover:text-civic-text hover:bg-civic-surface-secondary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-civic-accent/40">
        <ZoomIn className="w-4 h-4" />
      </button>
      <button
        onClick={() => map.zoomOut()} title="Zoom out" aria-label="Zoom out"
        className="w-8 h-8 flex items-center justify-center rounded-lg text-civic-text-muted hover:text-civic-text hover:bg-civic-surface-secondary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-civic-accent/40">
        <ZoomOut className="w-4 h-4" />
      </button>
      <button
        onClick={() => map.setView(center, zoom)} title="Recenter" aria-label="Recenter map on selected site"
        className="w-8 h-8 flex items-center justify-center rounded-lg text-civic-text-muted hover:text-civic-text hover:bg-civic-surface-secondary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-civic-accent/40">
        <LocateFixed className="w-4 h-4" />
      </button>
    </div>
  );
}

export default function MainMapPanel({
  selectedLocation, analysisState, selectedScenario, selectScenario,
  visualizedImages, presentPhotoUrl, presentPhotoSource, data, scenarioYears,
  userVisionText, setUserVisionText, referenceImage, setReferenceImage,
  handleGenerateVisualization, visualizingYear, visualizeError, copied, setCopied,
}) {
  const center = [selectedLocation.latitude, selectedLocation.longitude];
  const scenario = data.scenarios?.[selectedScenario];
  const overlaySrc = selectedScenario === '2026'
    ? presentPhotoUrl
    : (visualizedImages[selectedScenario] || scenario?.visualizationImage);
  const hasScenarios = !!data.scenarios;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 relative">
        <MapContainer center={center} zoom={15} style={{ height: '100%', width: '100%' }} className="z-0" attributionControl={false}>
          <RecenterMap center={center} zoom={15} />
          {/* prefix={false} drops Leaflet's own "Leaflet |" credit — not license-required (Leaflet is
              BSD-licensed). The OpenStreetMap/CARTO copyright text below is required by their license/ToS
              and stays; see .leaflet-control-attribution in index.css for the smaller, muted styling. */}
          <AttributionControl position="bottomright" prefix={false} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png"
          />
          <Marker position={center} icon={ACTIVE_SITE_ICON}>
            <Popup>
              <div style={{ fontFamily: 'system-ui' }}>
                <div style={{ fontWeight: 700, marginBottom: 3 }}>{selectedLocation.displayName || selectedLocation.formattedAddress}</div>
                <div style={{ fontSize: 12, color: '#94a3b8' }}>Active analysis site</div>
              </div>
            </Popup>
          </Marker>
          <MapControls center={center} zoom={15} />
        </MapContainer>

        {analysisState === 'complete' && hasScenarios && (
          <ScenarioTabs years={scenarioYears} scenarios={data.scenarios} selectedYear={selectedScenario} onSelect={selectScenario} />
        )}

        {analysisState === 'complete' && overlaySrc && (
          <div className="absolute inset-0 z-[400]">
            <img src={overlaySrc} alt={`${selectedScenario} view`} className="w-full h-full object-cover" />
            <div className="absolute top-20 left-4 bg-civic-surface/95 border border-civic-border rounded-lg px-3 py-1.5 shadow-civic-sm flex items-center gap-1.5">
              {selectedScenario === '2026' && <Camera className="w-3.5 h-3.5 text-civic-accent" />}
              <span className="text-xs font-semibold text-civic-text tracking-wider">
                {selectedScenario === '2026' ? 'TODAY — LIVE PHOTO' : `${selectedScenario} VISION`}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Below-map: projected-change stat strip, generation controls, timeline. Civic-planning
          redesign Phase 5: restyled and relabeled "Visualize Proposed Streetscape" — same
          handleGenerateVisualization handler, same conditional gating, same loading/error state,
          same reference-image fallback (ReferenceImageInput), same prompt-customization controls. */}
      {analysisState === 'complete' && hasScenarios && scenario && (
        <div className="shrink-0 border-t border-civic-border bg-civic-surface px-5 py-3 space-y-3">
          {scenario.projectedChanges?.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {scenario.projectedChanges.slice(0, 4).map((c, i) => {
                const MetricIcon = metricIcon(c);
                return (
                  <div key={i} className="flex items-center gap-1.5 bg-civic-surface-secondary border border-civic-border rounded-lg px-2.5 py-1.5">
                    <MetricIcon className="w-3 h-3 text-civic-accent shrink-0" />
                    <span className="text-[11px] text-civic-text leading-tight">{c}</span>
                  </div>
                );
              })}
            </div>
          )}

          {selectedScenario === '2026' ? (
            <div className="flex items-center gap-1.5 text-[11px] text-civic-text-muted bg-civic-surface-secondary border border-civic-border rounded-lg px-3 py-2">
              <Camera className="w-3.5 h-3.5 text-civic-accent shrink-0" />
              Live {presentPhotoSource === 'google-street-view' ? 'Street View' : 'satellite'} photo — the present-day site, not AI-generated.
            </div>
          ) : scenario.visualizationPrompt && !scenario.visualizationImage && !visualizedImages[selectedScenario] ? (
            <div className="bg-civic-surface-secondary border border-civic-border rounded-lg p-3">
              <button
                onClick={() => handleGenerateVisualization(scenario.visualizationPrompt, selectedScenario)}
                disabled={visualizingYear === selectedScenario}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-semibold bg-civic-accent hover:bg-civic-accent/90 text-white transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-civic-accent/40">
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
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
