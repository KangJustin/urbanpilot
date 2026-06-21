import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, AttributionControl, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Camera, ZoomIn, ZoomOut, LocateFixed } from 'lucide-react';

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
  selectedLocation, analysisState, selectedScenario,
  visualizedImages, presentPhotoUrl, data,
}) {
  const center = [selectedLocation.latitude, selectedLocation.longitude];
  const scenario = data.scenarios?.[selectedScenario];
  const overlaySrc = selectedScenario === '2026'
    ? presentPhotoUrl
    : (visualizedImages[selectedScenario] || scenario?.visualizationImage);

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
    </div>
  );
}
