import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import {
  Camera, Copy, Check, Sparkles, Loader2, TrendingUp, Layers, Maximize, ZoomIn, ZoomOut, LocateFixed,
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

// Animated pulsing site marker — gives the map a "live" feel instead of a static pin.
const ACTIVE_SITE_ICON = L.divIcon({
  html: `<div style="position:relative;width:22px;height:22px;">
    <div style="position:absolute;inset:0;border-radius:50%;background:#34d399;opacity:0.5;animation:site-pulse 2s ease-out infinite;"></div>
    <div style="position:absolute;inset:6px;border-radius:50%;background:#10b981;border:2px solid white;box-shadow:0 0 6px rgba(16,185,129,0.8);"></div>
  </div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
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

// Visual control dock, kepler.gl-inspired. Zoom/recenter are wired to the real map instance;
// Layers/Maximize are decorative chrome only (we removed the fake demo overlay data earlier,
// so there's nothing real for a layer toggle to control right now).
function MapControls({ center, zoom }) {
  const map = useMap();
  return (
    <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-1 bg-slate-900/90 border border-slate-700 rounded-xl p-1 backdrop-blur-sm">
      <button onClick={() => map.zoomIn()} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors" title="Zoom in">
        <ZoomIn className="w-4 h-4" />
      </button>
      <button onClick={() => map.zoomOut()} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors" title="Zoom out">
        <ZoomOut className="w-4 h-4" />
      </button>
      <button onClick={() => map.setView(center, zoom)} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors" title="Recenter">
        <LocateFixed className="w-4 h-4" />
      </button>
      <div className="h-px bg-slate-700 my-0.5" />
      <button className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-600 cursor-default" title="Layers">
        <Layers className="w-4 h-4" />
      </button>
      <button className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-600 cursor-default" title="Fullscreen">
        <Maximize className="w-4 h-4" />
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
        <MapContainer center={center} zoom={15} style={{ height: '100%', width: '100%' }} className="z-0">
          <RecenterMap center={center} zoom={15} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png"
            className="map-tiles-enhanced"
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
            <div className="absolute top-20 left-4 bg-slate-900/90 border border-emerald-700/50 rounded-lg px-3 py-1.5 backdrop-blur-sm flex items-center gap-1.5">
              {selectedScenario === '2026' && <Camera className="w-3.5 h-3.5 text-emerald-400" />}
              <span className="text-xs font-semibold text-emerald-400 tracking-wider">
                {selectedScenario === '2026' ? 'TODAY — LIVE PHOTO' : `${selectedScenario} VISION`}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Below-map: projected-change stat strip, generation controls, timeline */}
      {analysisState === 'complete' && hasScenarios && scenario && (
        <div className="shrink-0 border-t border-slate-800 bg-slate-900 px-5 py-3 space-y-3">
          {scenario.projectedChanges?.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {scenario.projectedChanges.slice(0, 4).map((c, i) => {
                const MetricIcon = metricIcon(c);
                return (
                  <div key={i} className="flex items-center gap-1.5 bg-slate-800/50 rounded-lg px-2.5 py-1.5">
                    <MetricIcon className="w-3 h-3 text-emerald-400 shrink-0" />
                    <span className="text-[11px] text-slate-300 leading-tight">{c}</span>
                  </div>
                );
              })}
            </div>
          )}

          {selectedScenario === '2026' ? (
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 bg-slate-800/40 border border-slate-700/40 rounded-lg px-3 py-2">
              <Camera className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              Live {presentPhotoSource === 'google-street-view' ? 'Street View' : 'satellite'} photo — the present-day site, not AI-generated.
            </div>
          ) : scenario.visualizationPrompt && !scenario.visualizationImage && !visualizedImages[selectedScenario] ? (
            <div className="bg-slate-800/50 border border-slate-700/60 rounded-lg p-3">
              <button
                onClick={() => handleGenerateVisualization(scenario.visualizationPrompt, selectedScenario)}
                disabled={visualizingYear === selectedScenario}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors disabled:opacity-50 shadow-[0_0_16px_2px_rgba(16,185,129,0.35)]">
                {visualizingYear === selectedScenario ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {visualizingYear === selectedScenario ? 'Generating Future Vision…' : `Generate Future Vision — ${selectedScenario}`}
              </button>
              {visualizeError && <p className="text-xs text-rose-400 mt-2">{visualizeError}</p>}
              <details className="mt-2.5">
                <summary className="text-[11px] font-medium text-slate-500 cursor-pointer">Customize prompt &amp; reference photo</summary>
                <div className="mt-2.5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] text-slate-500">Midjourney prompt</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(scenario.visualizationPrompt);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-md bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors">
                      {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed font-mono mb-2">{scenario.visualizationPrompt}</p>
                  <textarea
                    value={userVisionText}
                    onChange={e => setUserVisionText(e.target.value)}
                    placeholder="Describe how you want this area to change (optional)…"
                    rows={2}
                    className="w-full bg-slate-800 border border-slate-700 text-white text-xs rounded-lg px-3 py-2 mb-2 resize-none placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-colors"
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
