import React, { useState } from 'react';
import './index.css';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
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

// Component to update map view based on active overlays
function MapUpdater({ activeOverlays, currentScenario }) {
  const map = useMap();
  
  // You can add logic here to update map layers based on activeOverlays
  // For now, we'll just log the changes
  React.useEffect(() => {
    console.log('Active overlays:', activeOverlays);
    console.log('Current scenario:', currentScenario);
  }, [activeOverlays, currentScenario]);
  
  return null;
}

function App() {
  const [currentScenario, setCurrentScenario] = useState('current');
  const [activeOverlays, setActiveOverlays] = useState(['heat', 'green']);

  const handleOverlayToggle = (overlayId) => {
    setActiveOverlays(prev => 
      prev.includes(overlayId)
        ? prev.filter(id => id !== overlayId)
        : [...prev, overlayId]
    );
  };

  // Scenario data
  const scenarios = [
    { 
      id: 'current', 
      label: 'Current State', 
      desc: 'Existing conditions',
      metrics: { green: 18, temp: 85, air: 'C+', energy: 65, walk: 42 }
    },
    { 
      id: 'basic', 
      label: 'Basic Development', 
      desc: 'Standard planning approach',
      metrics: { green: 23, temp: 83, air: 'B-', energy: 72, walk: 58 }
    },
    { 
      id: 'climate', 
      label: 'Climate-Responsive', 
      desc: 'Optimized for sustainability',
      metrics: { green: 31, temp: 78, air: 'B+', energy: 89, walk: 76 }
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

  // Sample data points for the map
  const mapMarkers = [
    {
      id: 1,
      position: [42.3601, -71.0589], // Boston coordinates
      title: "Climate Pavilion Alpha",
      type: "climate",
      efficiency: "high"
    },
    {
      id: 2,
      position: [42.3584, -71.0598],
      title: "Green Space Beta",
      type: "green",
      efficiency: "medium"
    },
    {
      id: 3,
      position: [42.3611, -71.0571],
      title: "Urban Development Gamma",
      type: "building",
      efficiency: "low"
    }
  ];

  // Debug: Log when component renders
  console.log('App component rendering, currentScenario:', currentScenario);

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
                  <span className="text-sm text-gray-400">{scenarios[0].metrics.green}%</span>
                  <span className="text-sm">→</span>
                  <span className="text-sm font-medium text-green-600">{currentScenarioData.metrics.green}%</span>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    currentScenarioData.metrics.green > scenarios[0].metrics.green 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {currentScenarioData.metrics.green > scenarios[0].metrics.green ? '+' : ''}
                    {currentScenarioData.metrics.green - scenarios[0].metrics.green}%
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Average Temperature</span>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-400">{scenarios[0].metrics.temp}°F</span>
                  <span className="text-sm">→</span>
                  <span className="text-sm font-medium text-blue-600">{currentScenarioData.metrics.temp}°F</span>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    currentScenarioData.metrics.temp < scenarios[0].metrics.temp 
                      ? 'bg-blue-100 text-blue-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {currentScenarioData.metrics.temp - scenarios[0].metrics.temp}°F
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Energy Efficiency</span>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-400">{scenarios[0].metrics.energy}</span>
                  <span className="text-sm">→</span>
                  <span className="text-sm font-medium text-green-600">{currentScenarioData.metrics.energy}</span>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    currentScenarioData.metrics.energy > scenarios[0].metrics.energy 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    +{currentScenarioData.metrics.energy - scenarios[0].metrics.energy}
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Walk Score</span>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-400">{scenarios[0].metrics.walk}</span>
                  <span className="text-sm">→</span>
                  <span className="text-sm font-medium text-indigo-600">{currentScenarioData.metrics.walk}</span>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    currentScenarioData.metrics.walk > scenarios[0].metrics.walk 
                      ? 'bg-indigo-100 text-indigo-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    +{currentScenarioData.metrics.walk - scenarios[0].metrics.walk}
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Air Quality</span>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-400">{scenarios[0].metrics.air}</span>
                  <span className="text-sm">→</span>
                  <span className="text-sm font-medium text-purple-600">{currentScenarioData.metrics.air}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Map Area */}
      <div className="flex-1 relative" style={{ minHeight: '400px' }}>
        {/* Debug: Test if this div shows up */}
        <div style={{ 
          position: 'absolute', 
          top: '10px', 
          left: '10px', 
          background: 'red', 
          color: 'white', 
          padding: '5px', 
          zIndex: 1000 
        }}>
          Map Container Test
        </div>
        
        <MapContainer
          center={[42.3601, -71.0589]} // Boston coordinates
          zoom={13}
          style={{ height: '100%', width: '100%' }}
          className="z-0"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {/* Map updater component */}
          <MapUpdater activeOverlays={activeOverlays} currentScenario={currentScenario} />
          
          {/* Sample markers */}
          {mapMarkers.map(marker => (
            <Marker key={marker.id} position={marker.position}>
              <Popup>
                <div className="p-2">
                  <h3 className="font-semibold text-gray-800">{marker.title}</h3>
                  <p className="text-sm text-gray-600">Type: {marker.type}</p>
                  <p className="text-sm text-gray-600">Efficiency: {marker.efficiency}</p>
                  <p className="text-sm text-gray-600">Scenario: {currentScenarioData.label}</p>
                </div>
              </Popup>
            </Marker>
          ))}
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