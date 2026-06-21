import React, { useState, useEffect, useRef } from 'react';
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
import { Map as MapIcon, Satellite, Eye, Loader2, AlertTriangle, RotateCw } from 'lucide-react';
import { getStreetViewStatus } from '../services/analysisApi';

const API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
let optionsConfigured = false;

function ensureConfigured() {
  if (!optionsConfigured && API_KEY) {
    setOptions({ key: API_KEY, v: 'weekly' });
    optionsConfigured = true;
  }
}

const VIEW_MODES = [
  { id: 'street-view', label: 'Street View', icon: Eye },
  { id: 'map', label: 'Map', icon: MapIcon },
  { id: 'satellite', label: 'Satellite', icon: Satellite },
];

export default function PresentDayView({ location }) {
  const [mode, setMode] = useState('map');
  const [streetViewAvailable, setStreetViewAvailable] = useState(null); // null = checking
  const [heading, setHeading] = useState(0);
  const [loadError, setLoadError] = useState(null);
  const [loaded, setLoaded] = useState(false);

  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const panoramaRef = useRef(null);
  const markerRef = useRef(null);

  // Check Street View coverage whenever the location changes; default to map view if unavailable.
  useEffect(() => {
    let cancelled = false;
    setStreetViewAvailable(null);
    getStreetViewStatus(location.latitude, location.longitude)
      .then(({ available }) => {
        if (cancelled) return;
        setStreetViewAvailable(available);
        setMode(available ? 'street-view' : 'map');
      })
      .catch(() => {
        if (cancelled) return;
        setStreetViewAvailable(false);
        setMode('map');
      });
    return () => { cancelled = true; };
  }, [location.latitude, location.longitude]);

  // Load the Google Maps JS API once.
  useEffect(() => {
    if (!API_KEY) {
      setLoadError('not-configured');
      return;
    }
    ensureConfigured();
    importLibrary('maps')
      .then(() => importLibrary('streetView'))
      .then(() => setLoaded(true))
      .catch(err => setLoadError(err.message || 'Failed to load Google Maps'));
  }, []);

  // Render whichever mode is active. Each switch tears down the previous Map/Panorama by
  // clearing the container first — neither has an explicit destroy() method, and leaving the
  // old instance attached alongside a new one on the same node causes Google Maps to error.
  useEffect(() => {
    if (!loaded || !containerRef.current) return;
    containerRef.current.innerHTML = '';
    mapRef.current = null;
    panoramaRef.current = null;
    markerRef.current = null;

    const position = { lat: location.latitude, lng: location.longitude };

    if (mode === 'street-view') {
      panoramaRef.current = new window.google.maps.StreetViewPanorama(containerRef.current, {
        position,
        pov: { heading, pitch: 0 },
        zoom: 1,
        addressControl: false,
      });
    } else {
      const map = new window.google.maps.Map(containerRef.current, {
        center: position,
        zoom: 18,
        mapTypeId: mode === 'satellite' ? 'satellite' : 'roadmap',
        streetViewControl: false,
      });
      mapRef.current = map;
      markerRef.current = new window.google.maps.Marker({ map, position });
    }
  }, [loaded, mode, location.latitude, location.longitude, heading]);

  if (!API_KEY) {
    return (
      <div className="rounded-lg border border-civic-border bg-civic-surface-secondary p-4 text-xs text-civic-text-muted">
        <div className="flex items-center gap-1.5 mb-1">
          <AlertTriangle className="w-3.5 h-3.5 text-civic-housing" />
          <span className="font-medium text-civic-text">Present-day view not configured</span>
        </div>
        Set REACT_APP_GOOGLE_MAPS_API_KEY to enable the live Google Maps / Street View panel.
      </div>
    );
  }

  return (
    <div className="overflow-hidden">
      <div className="flex items-center gap-1.5 p-2 bg-civic-surface-secondary border-b border-civic-border">
        {VIEW_MODES.map(({ id, label, icon: Icon }) => {
          const disabled = id === 'street-view' && streetViewAvailable === false;
          const active = mode === id;
          return (
            <button
              key={id}
              onClick={() => !disabled && setMode(id)}
              disabled={disabled}
              aria-pressed={active}
              className={`flex items-center gap-1 text-[11px] px-2 py-1 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-civic-accent/40 ${
                active ? 'bg-civic-accent text-white' : 'text-civic-text-muted hover:text-civic-text'
              } ${disabled ? 'opacity-30 cursor-not-allowed' : ''}`}>
              <Icon className="w-3 h-3" /> {label}
            </button>
          );
        })}
        {mode === 'street-view' && streetViewAvailable && (
          <button
            onClick={() => setHeading(h => (h + 45) % 360)}
            aria-label="Rotate Street View 45 degrees"
            className="ml-auto flex items-center gap-1 text-[11px] px-2 py-1 rounded-md text-civic-text-muted hover:text-civic-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-civic-accent/40">
            <RotateCw className="w-3 h-3" /> Rotate
          </button>
        )}
      </div>

      <div className="relative h-[160px] bg-civic-surface-secondary">
        {!loaded && !loadError && (
          <div className="absolute inset-0 flex items-center justify-center text-civic-text-muted">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        )}
        {loadError && loadError !== 'not-configured' && (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-civic-risk-high px-4 text-center" role="alert">
            Google Maps failed to load: {loadError}
          </div>
        )}
        {streetViewAvailable === null && mode === 'street-view' && (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-civic-text-muted gap-1.5">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Checking Street View coverage…
          </div>
        )}
        {streetViewAvailable === false && mode === 'street-view' && (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-civic-text-muted px-4 text-center">
            Street View is not available for this location.
          </div>
        )}
        <div ref={containerRef} className="w-full h-full" />
      </div>

      <div className="px-3 py-2 bg-civic-surface-secondary text-[11px] text-civic-text-muted">
        {location.formattedAddress} · {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
      </div>
    </div>
  );
}
