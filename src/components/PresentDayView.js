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
      <div className="rounded-lg border border-slate-700/60 bg-slate-800/40 p-4 text-xs text-slate-500">
        <div className="flex items-center gap-1.5 mb-1">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          <span className="font-medium text-slate-400">Present-day view not configured</span>
        </div>
        Set REACT_APP_GOOGLE_MAPS_API_KEY to enable the live Google Maps / Street View panel.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-700/60 overflow-hidden">
      <div className="flex items-center gap-1.5 p-2 bg-slate-800/60 border-b border-slate-700/60">
        {VIEW_MODES.map(({ id, label, icon: Icon }) => {
          const disabled = id === 'street-view' && streetViewAvailable === false;
          return (
            <button
              key={id}
              onClick={() => !disabled && setMode(id)}
              disabled={disabled}
              className={`flex items-center gap-1 text-[11px] px-2 py-1 rounded-md transition-colors ${
                mode === id ? 'bg-emerald-700 text-white' : 'text-slate-400 hover:text-white'
              } ${disabled ? 'opacity-30 cursor-not-allowed' : ''}`}>
              <Icon className="w-3 h-3" /> {label}
            </button>
          );
        })}
        {mode === 'street-view' && streetViewAvailable && (
          <button
            onClick={() => setHeading(h => (h + 45) % 360)}
            className="ml-auto flex items-center gap-1 text-[11px] px-2 py-1 rounded-md text-slate-400 hover:text-white">
            <RotateCw className="w-3 h-3" /> Rotate
          </button>
        )}
      </div>

      <div className="relative h-[160px] bg-slate-800">
        {!loaded && !loadError && (
          <div className="absolute inset-0 flex items-center justify-center text-slate-500">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        )}
        {loadError && loadError !== 'not-configured' && (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-rose-400 px-4 text-center">
            Google Maps failed to load: {loadError}
          </div>
        )}
        {streetViewAvailable === null && mode === 'street-view' && (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-500 gap-1.5">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Checking Street View coverage…
          </div>
        )}
        <div ref={containerRef} className="w-full h-full" />
      </div>

      <div className="px-3 py-2 bg-slate-800/40 text-[11px] text-slate-500">
        {location.formattedAddress} · {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
      </div>
    </div>
  );
}
