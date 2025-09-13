import React, { useState, useEffect } from 'react';
import './index.css';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle, Polygon } from 'react-leaflet';
import L from 'leaflet';

// Fix for default markers in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Simple icon components
const MapIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
    <circle cx="12" cy="10" r="3"/>
  </svg>
);

const LayersIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="12,2 2,7 12,12 22,7 12,2"/>
    <polyline points="2,17 12,22 22,17"/>
    <polyline points="2,12 12,17 22,12"/>
  </svg>
);

const BarChartIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="12" y1="20" x2="12" y2="10"/>
    <line x1="18" y1="20" x2="18" y2="4"/>
    <line x1="6" y1="20" x2="6" y2="16"/>
  </svg>
);

const MapPinIcon = () => (
  <svg className="w-16 h-16 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
    <circle cx="12" cy="10" r="3"/>
  </svg>
);

// Component to render overlay effects
function MapOverlays({ activeOverlays, currentScenario, mapCenter }) {
  const map = useMap();
  
  // Generate overlay data based on map center and scenario
  const getScenarioData = () => {
    const [centerLat, centerLng] = mapCenter || [42.3601, -71.0589];
    const offset = 0.005; // Smaller offset for better clustering around center
    
    switch (currentScenario) {
      case 'current':
        return {
          heatZones: [
            { center: [centerLat, centerLng], radius: 300, intensity: 0.8, color: 'red' },
            { center: [centerLat + offset, centerLng - offset], radius: 200, intensity: 0.6, color: 'orange' },
            { center: [centerLat - offset, centerLng + offset], radius: 150, intensity: 0.4, color: 'yellow' }
          ],
          greenSpaces: [
            { center: [centerLat + offset*0.5, centerLng + offset*0.5], radius: 180, color: 'green' },
            { center: [centerLat - offset*0.8, centerLng - offset*0.3], radius: 120, color: 'lightgreen' }
          ],
          trafficZones: [
            { center: [centerLat + offset*0.3, centerLng - offset*0.3], radius: 250, intensity: 0.9, color: 'blue' },
            { center: [centerLat - offset*0.5, centerLng + offset*0.5], radius: 180, intensity: 0.7, color: 'lightblue' }
          ]
        };
      case 'basic':
        return {
          heatZones: [
            { center: [centerLat, centerLng], radius: 250, intensity: 0.7, color: 'red' },
            { center: [centerLat + offset, centerLng - offset], radius: 180, intensity: 0.5, color: 'orange' },
            { center: [centerLat - offset, centerLng + offset], radius: 120, intensity: 0.3, color: 'yellow' }
          ],
          greenSpaces: [
            { center: [centerLat + offset*0.5, centerLng + offset*0.5], radius: 160, color: 'green' },
            { center: [centerLat - offset*0.8, centerLng - offset*0.3], radius: 130, color: 'lightgreen' },
            { center: [centerLat + offset*0.7, centerLng + offset*0.3], radius: 100, color: 'green' }
          ],
          trafficZones: [
            { center: [centerLat + offset*0.3, centerLng - offset*0.3], radius: 200, intensity: 0.8, color: 'blue' },
            { center: [centerLat - offset*0.5, centerLng + offset*0.5], radius: 140, intensity: 0.6, color: 'lightblue' },
            { center: [centerLat + offset*0.8, centerLng + offset*0.8], radius: 100, intensity: 0.4, color: 'cyan' }
          ]
        };
      case 'climate':
        return {
          heatZones: [
            { center: [centerLat, centerLng], radius: 180, intensity: 0.4, color: 'red' },
            { center: [centerLat + offset, centerLng - offset], radius: 140, intensity: 0.3, color: 'orange' },
            { center: [centerLat - offset, centerLng + offset], radius: 100, intensity: 0.2, color: 'yellow' }
          ],
          greenSpaces: [
            { center: [centerLat + offset*0.5, centerLng + offset*0.5], radius: 220, color: 'green' },
            { center: [centerLat - offset*0.8, centerLng - offset*0.3], radius: 180, color: 'lightgreen' },
            { center: [centerLat + offset*0.7, centerLng + offset*0.3], radius: 150, color: 'green' },
            { center: [centerLat - offset*0.4, centerLng + offset*0.6], radius: 120, color: 'lightgreen' }
          ],
          trafficZones: [
            { center: [centerLat + offset*0.3, centerLng - offset*0.3], radius: 160, intensity: 0.6, color: 'blue' },
            { center: [centerLat - offset*0.5, centerLng + offset*0.5], radius: 120, intensity: 0.4, color: 'lightblue' },
            { center: [centerLat + offset*0.8, centerLng + offset*0.8], radius: 80, intensity: 0.3, color: 'cyan' }
          ]
        };
      default:
        return {
          heatZones: [],
          greenSpaces: [],
          trafficZones: []
        };
    }
  };

  const { heatZones, greenSpaces, trafficZones } = getScenarioData();

  // Debug logging
  useEffect(() => {
    console.log('MapOverlays - Active overlays:', activeOverlays);
    console.log('MapOverlays - Current scenario:', currentScenario);
    console.log('MapOverlays - Heat zones:', heatZones.length);
    console.log('MapOverlays - Green spaces:', greenSpaces.length);
    console.log('MapOverlays - Traffic zones:', trafficZones.length);
  }, [activeOverlays, currentScenario, heatZones, greenSpaces, trafficZones]);

  return (
    <>
      {/* Heat Island Overlay */}
      {activeOverlays.includes('heat') && heatZones.map((zone, index) => (
        <Circle
          key={`heat-${index}`}
          center={zone.center}
          radius={zone.radius}
          pathOptions={{
            color: zone.color,
            fillColor: zone.color,
            fillOpacity: zone.intensity * 0.3,
            weight: 2,
            opacity: zone.intensity
          }}
        />
      ))}

      {/* Green Space Overlay */}
      {activeOverlays.includes('green') && greenSpaces.map((space, index) => (
        <Circle
          key={`green-${index}`}
          center={space.center}
          radius={space.radius}
          pathOptions={{
            color: space.color,
            fillColor: space.color,
            fillOpacity: 0.4,
            weight: 2,
            opacity: 0.7
          }}
        />
      ))}

      {/* Traffic Flow Overlay */}
      {activeOverlays.includes('traffic') && trafficZones.map((zone, index) => (
        <Circle
          key={`traffic-${index}`}
          center={zone.center}
          radius={zone.radius}
          pathOptions={{
            color: zone.color,
            fillColor: zone.color,
            fillOpacity: zone.intensity * 0.2,
            weight: 1,
            opacity: zone.intensity * 0.6
          }}
        />
      ))}
    </>
  );
}

// Custom Location Form Component
function CustomLocationForm({ onSubmit }) {
  const [formData, setFormData] = useState({
    title: '',
    type: 'building',
    efficiency: 'medium',
    lat: '',
    lng: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.title && formData.lat && formData.lng) {
      onSubmit(formData);
      setFormData({ title: '', type: 'building', efficiency: 'medium', lat: '', lng: '' });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 p-4 bg-gray-50 rounded-lg">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Location Name
        </label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => setFormData({...formData, title: e.target.value})}
          className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
          placeholder="e.g., Central Park"
          required
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Type
        </label>
        <select
          value={formData.type}
          onChange={(e) => setFormData({...formData, type: e.target.value})}
          className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
        >
          <option value="building">Building</option>
          <option value="green">Green Space</option>
          <option value="climate">Climate Pavilion</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Efficiency
        </label>
        <select
          value={formData.efficiency}
          onChange={(e) => setFormData({...formData, efficiency: e.target.value})}
          className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Latitude
          </label>
          <input
            type="number"
            step="any"
            value={formData.lat}
            onChange={(e) => setFormData({...formData, lat: e.target.value})}
            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
            placeholder="40.7128"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Longitude
          </label>
          <input
            type="number"
            step="any"
            value={formData.lng}
            onChange={(e) => setFormData({...formData, lng: e.target.value})}
            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
            placeholder="-74.0060"
            required
          />
        </div>
      </div>

      <button
        type="submit"
        className="w-full p-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
      >
        Add Location
      </button>
    </form>
  );
}

function App() {
  const [currentScenario, setCurrentScenario] = useState('current');
  const [activeOverlays, setActiveOverlays] = useState(['heat', 'green']);
  const [selectedLocation, setSelectedLocation] = useState('boston');
  const [customLocations, setCustomLocations] = useState([]);
  const [showLocationForm, setShowLocationForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleOverlayToggle = (overlayId) => {
    setActiveOverlays(prev => 
      prev.includes(overlayId)
        ? prev.filter(id => id !== overlayId)
        : [...prev, overlayId]
    );
  };

  // Predefined city locations
  const cityLocations = {
    boston: {
      name: 'Boston, MA',
      center: [42.3601, -71.0589],
      zoom: 13,
      markers: [
        { id: 1, position: [42.3601, -71.0589], title: "Climate Pavilion Alpha", type: "climate", efficiency: "high" },
        { id: 2, position: [42.3584, -71.0598], title: "Green Space Beta", type: "green", efficiency: "medium" },
        { id: 3, position: [42.3611, -71.0571], title: "Urban Development Gamma", type: "building", efficiency: "low" }
      ]
    },
    newyork: {
      name: 'New York, NY',
      center: [40.7128, -74.0060],
      zoom: 12,
      markers: [
        { id: 4, position: [40.7589, -73.9851], title: "Central Park Green Zone", type: "green", efficiency: "high" },
        { id: 5, position: [40.7505, -73.9934], title: "Times Square District", type: "building", efficiency: "medium" },
        { id: 6, position: [40.7614, -73.9776], title: "Climate Innovation Hub", type: "climate", efficiency: "high" }
      ]
    },
    sanfrancisco: {
      name: 'San Francisco, CA',
      center: [37.7749, -122.4194],
      zoom: 13,
      markers: [
        { id: 7, position: [37.7849, -122.4094], title: "Golden Gate Park", type: "green", efficiency: "high" },
        { id: 8, position: [37.7849, -122.4094], title: "Tech Campus Alpha", type: "climate", efficiency: "high" },
        { id: 9, position: [37.7849, -122.4094], title: "Downtown Core", type: "building", efficiency: "medium" }
      ]
    },
    london: {
      name: 'London, UK',
      center: [51.5074, -0.1278],
      zoom: 12,
      markers: [
        { id: 10, position: [51.5074, -0.1278], title: "Hyde Park Green Space", type: "green", efficiency: "high" },
        { id: 11, position: [51.5074, -0.1278], title: "Financial District", type: "building", efficiency: "medium" },
        { id: 12, position: [51.5074, -0.1278], title: "Sustainable Tower", type: "climate", efficiency: "high" }
      ]
    },
    singapore: {
      name: 'Singapore',
      center: [1.3521, 103.8198],
      zoom: 12,
      markers: [
        { id: 13, position: [1.3521, 103.8198], title: "Gardens by the Bay", type: "green", efficiency: "high" },
        { id: 14, position: [1.3521, 103.8198], title: "Marina Bay District", type: "climate", efficiency: "high" },
        { id: 15, position: [1.3521, 103.8198], title: "CBD Complex", type: "building", efficiency: "medium" }
      ]
    }
  };

  // Get current location data
  const currentLocationData = cityLocations[selectedLocation] || cityLocations.boston;
  const allMarkers = [...currentLocationData.markers, ...customLocations];

  const handleLocationChange = (locationId) => {
    setSelectedLocation(locationId);
  };

  const handleAddCustomLocation = (newLocation) => {
    const customLocation = {
      id: Date.now(),
      position: [newLocation.lat, newLocation.lng],
      title: newLocation.title,
      type: newLocation.type,
      efficiency: newLocation.efficiency
    };
    setCustomLocations(prev => [...prev, customLocation]);
    setShowLocationForm(false);
  };

  const handleDeleteCustomLocation = (locationId) => {
    setCustomLocations(prev => prev.filter(loc => loc.id !== locationId));
  };

  // Location-specific scenario data
  const getLocationMetrics = (locationId, scenarioId) => {
    const baseMetrics = {
      boston: {
        current: { green: 18, temp: 85, air: 'C+', energy: 65, walk: 42 },
        basic: { green: 23, temp: 83, air: 'B-', energy: 72, walk: 58 },
        climate: { green: 31, temp: 78, air: 'B+', energy: 89, walk: 76 }
      },
      newyork: {
        current: { green: 15, temp: 88, air: 'C', energy: 60, walk: 85 },
        basic: { green: 20, temp: 86, air: 'C+', energy: 68, walk: 88 },
        climate: { green: 28, temp: 82, air: 'B', energy: 85, walk: 92 }
      },
      sanfrancisco: {
        current: { green: 22, temp: 75, air: 'B', energy: 70, walk: 78 },
        basic: { green: 27, temp: 73, air: 'B+', energy: 77, walk: 82 },
        climate: { green: 35, temp: 70, air: 'A-', energy: 92, walk: 88 }
      },
      london: {
        current: { green: 20, temp: 72, air: 'C+', energy: 62, walk: 75 },
        basic: { green: 25, temp: 70, air: 'B-', energy: 70, walk: 80 },
        climate: { green: 33, temp: 67, air: 'B+', energy: 87, walk: 85 }
      },
      singapore: {
        current: { green: 25, temp: 90, air: 'B-', energy: 75, walk: 70 },
        basic: { green: 30, temp: 88, air: 'B', energy: 82, walk: 75 },
        climate: { green: 38, temp: 85, air: 'A-', energy: 95, walk: 82 }
      }
    };
    
    return baseMetrics[locationId]?.[scenarioId] || baseMetrics.boston.current;
  };

  // Scenario data with dynamic metrics
  const scenarios = [
    { 
      id: 'current', 
      label: 'Current State', 
      desc: 'Existing conditions',
      getMetrics: () => getLocationMetrics(selectedLocation, 'current')
    },
    { 
      id: 'basic', 
      label: 'Basic Development', 
      desc: 'Standard planning approach',
      getMetrics: () => getLocationMetrics(selectedLocation, 'basic')
    },
    { 
      id: 'climate', 
      label: 'Climate-Responsive', 
      desc: 'Optimized for sustainability',
      getMetrics: () => getLocationMetrics(selectedLocation, 'climate')
    }
  ];

  // Overlay options
  const overlayOptions = [
    { 
      id: 'heat', 
      label: 'Temperature', 
      desc: 'Urban heat island effect',
      color: 'bg-red-500' 
    },
    { 
      id: 'green', 
      label: 'Green Coverage', 
      desc: 'Vegetation and parks',
      color: 'bg-green-500' 
    },
    { 
      id: 'traffic', 
      label: 'Traffic Flow', 
      desc: 'Vehicle density patterns',
      color: 'bg-blue-500' 
    }
  ];

  // Get current scenario data
  const currentScenarioData = scenarios.find(s => s.id === currentScenario) || scenarios[0];
  const currentMetrics = currentScenarioData.getMetrics();
  const baselineMetrics = scenarios[0].getMetrics(); // Current state for comparison


  return (
    <div className="h-screen flex bg-gray-50">
      {/* Left Sidebar */}
      <div className="w-80 bg-white shadow-lg overflow-y-auto">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">
              Urban Planning Tool
            </h1>
            <p className="text-gray-600">
              Visualize climate-responsive development impacts
            </p>
          </div>

          {/* Location Search */}
          <div>
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center">
              <MapIcon />
              <span className="ml-2">Location Search</span>
            </h3>
            
            {/* City Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select City
              </label>
              <select
                value={selectedLocation}
                onChange={(e) => handleLocationChange(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {Object.entries(cityLocations).map(([key, city]) => (
                  <option key={key} value={key}>
                    {city.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Add Custom Location Button */}
            <button
              onClick={() => setShowLocationForm(!showLocationForm)}
              className="w-full p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors mb-4"
            >
              {showLocationForm ? 'Cancel' : '+ Add Custom Location'}
            </button>

            {/* Custom Location Form */}
            {showLocationForm && (
              <CustomLocationForm onSubmit={handleAddCustomLocation} />
            )}

            {/* Custom Locations List */}
            {customLocations.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Custom Locations</h4>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {customLocations.map(location => (
                    <div key={location.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-800">{location.title}</div>
                        <div className="text-xs text-gray-500">{location.type} • {location.efficiency}</div>
                      </div>
                      <button
                        onClick={() => handleDeleteCustomLocation(location.id)}
                        className="text-red-500 hover:text-red-700 text-sm"
                        title="Delete location"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Scenario Selector */}
          <div>
            <h3 className="font-semibold text-gray-800 mb-4">Development Scenarios</h3>
            <div className="space-y-3">
              {scenarios.map(scenario => (
                <button
                  key={scenario.id}
                  onClick={() => setCurrentScenario(scenario.id)}
                  className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                    currentScenario === scenario.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="font-medium text-gray-800">{scenario.label}</div>
                  <div className="text-sm text-gray-600">{scenario.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Overlay Controls */}
          <div>
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center">
              <LayersIcon />
              <span className="ml-2">Map Overlays</span>
            </h3>
            <div className="space-y-3">
              {overlayOptions.map(overlay => (
                <div key={overlay.id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${overlay.color}`}></div>
                    <div>
                      <div className="font-medium text-gray-700 text-sm">{overlay.label}</div>
                      <div className="text-xs text-gray-500">{overlay.desc}</div>
                    </div>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={activeOverlays.includes(overlay.id)}
                    onChange={() => handleOverlayToggle(overlay.id)}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Impact Metrics */}
          <div>
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center">
              <BarChartIcon />
              <span className="ml-2">Impact Comparison</span>
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Green Space Coverage</span>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-400">{baselineMetrics.green}%</span>
                  <span className="text-sm">→</span>
                  <span className="text-sm font-medium text-green-600">{currentMetrics.green}%</span>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    currentMetrics.green > baselineMetrics.green 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {currentMetrics.green > baselineMetrics.green ? '+' : ''}
                    {currentMetrics.green - baselineMetrics.green}%
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Average Temperature</span>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-400">{baselineMetrics.temp}°F</span>
                  <span className="text-sm">→</span>
                  <span className="text-sm font-medium text-blue-600">{currentMetrics.temp}°F</span>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    currentMetrics.temp < baselineMetrics.temp 
                      ? 'bg-blue-100 text-blue-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {currentMetrics.temp - baselineMetrics.temp}°F
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Energy Efficiency</span>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-400">{baselineMetrics.energy}</span>
                  <span className="text-sm">→</span>
                  <span className="text-sm font-medium text-green-600">{currentMetrics.energy}</span>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    currentMetrics.energy > baselineMetrics.energy 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    +{currentMetrics.energy - baselineMetrics.energy}
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Walk Score</span>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-400">{baselineMetrics.walk}</span>
                  <span className="text-sm">→</span>
                  <span className="text-sm font-medium text-indigo-600">{currentMetrics.walk}</span>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    currentMetrics.walk > baselineMetrics.walk 
                      ? 'bg-indigo-100 text-indigo-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    +{currentMetrics.walk - baselineMetrics.walk}
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Air Quality</span>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-400">{baselineMetrics.air}</span>
                  <span className="text-sm">→</span>
                  <span className="text-sm font-medium text-purple-600">{currentMetrics.air}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Map Area */}
      <div className="flex-1 relative" style={{ minHeight: '400px' }}>
        <MapContainer
          center={currentLocationData.center}
          zoom={currentLocationData.zoom}
          style={{ height: '100%', width: '100%' }}
          className="z-0"
          key={selectedLocation} // Force re-render when location changes
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {/* Map overlay effects */}
          <MapOverlays 
            activeOverlays={activeOverlays} 
            currentScenario={currentScenario} 
            mapCenter={currentLocationData.center}
          />
          
          {/* Dynamic markers */}
          {allMarkers.map(marker => {
            const isCustomLocation = customLocations.some(custom => custom.id === marker.id);
            return (
              <Marker key={marker.id} position={marker.position}>
                <Popup>
                  <div className="p-2">
                    <h3 className="font-semibold text-gray-800">{marker.title}</h3>
                    <p className="text-sm text-gray-600">Type: {marker.type}</p>
                    <p className="text-sm text-gray-600">Efficiency: {marker.efficiency}</p>
                    <p className="text-sm text-gray-600">Scenario: {currentScenarioData.label}</p>
                    <p className="text-sm text-gray-600">Location: {currentLocationData.name}</p>
                    {isCustomLocation && (
                      <button
                        onClick={() => handleDeleteCustomLocation(marker.id)}
                        className="mt-2 px-3 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600"
                      >
                        Delete Location
                      </button>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>

        {/* Legend */}
        <div className="absolute bottom-4 right-4 bg-white rounded-lg shadow-lg p-4 z-10">
          <h4 className="font-semibold text-gray-800 mb-2">Legend</h4>
          <div className="space-y-1 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded"></div>
              <span>High Efficiency Buildings</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-500 rounded"></div>
              <span>Medium Efficiency</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-500 rounded"></div>
              <span>Low Efficiency</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-400 rounded"></div>
              <span>Green Spaces</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-purple-500 rounded"></div>
              <span>Climate Pavilions</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;