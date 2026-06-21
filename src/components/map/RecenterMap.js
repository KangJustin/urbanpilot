import { useEffect } from 'react';
import { useMap } from 'react-leaflet';

// react-leaflet's MapContainer center/zoom props only apply on first mount; recenter
// explicitly whenever the selected location changes.
export default function RecenterMap({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, map, zoom]);
  return null;
}
