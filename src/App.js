import React, { useState, useEffect } from 'react';
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
  
  const getScenarioData = () => {
    const [centerLat, centerLng] = mapCenter || [42.3601, -71.0589];
    const offset = 0.005;
    
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

// Location Optimization Algorithm
const optimizeLocations = (projectType, projectSize, mapCenter, optimizationFactors) => {
  const [centerLat, centerLng] = mapCenter;
  const searchRadius = 0.01; // ~1km radius
  const candidateLocations = [];

  // Generate candidate locations in a grid pattern
  for (let i = -5; i <= 5; i++) {
    for (let j = -5; j <= 5; j++) {
      const lat = centerLat + (i * searchRadius / 5);
      const lng = centerLng + (j * searchRadius / 5);
      
      candidateLocations.push({
        id: `candidate-${i}-${j}`,
        lat,
        lng,
        position: [lat, lng]
      });
    }
  }

  // Evaluate each candidate location
  const evaluatedLocations = candidateLocations.map(location => {
    const scores = evaluateLocation(location, projectType, projectSize, mapCenter, optimizationFactors);
    return {
      ...location,
      ...scores,
      overallScore: calculateOverallScore(scores, optimizationFactors)
    };
  });

  // Sort by overall score and return top recommendations
  return evaluatedLocations
    .sort((a, b) => b.overallScore - a.overallScore)
    .slice(0, 5)
    .map((location, index) => ({
      ...location,
      rank: index + 1,
      title: `Recommended Site ${index + 1}`,
      type: getMarkerType(location.overallScore),
      efficiency: getEfficiencyRating(location.overallScore)
    }));
};

// Evaluate a single location based on multiple factors
const evaluateLocation = (location, projectType, projectSize, mapCenter, optimizationFactors) => {
  const [centerLat, centerLng] = mapCenter;
  const distance = Math.sqrt(
    Math.pow(location.lat - centerLat, 2) + Math.pow(location.lng - centerLng, 2)
  );

  // Environmental factors
  const environmentalScore = calculateEnvironmentalScore(location, projectType, distance);
  
  // Social factors
  const socialScore = calculateSocialScore(location, projectType, distance);
  
  // Infrastructure factors
  const infrastructureScore = calculateInfrastructureScore(location, projectType, distance);
  
  // Economic factors
  const economicScore = calculateEconomicScore(location, projectType, projectSize, distance);

  return {
    environmentalScore,
    socialScore,
    infrastructureScore,
    economicScore,
    distance
  };
};

// Calculate environmental impact score
const calculateEnvironmentalScore = (location, projectType, distance) => {
  let score = 50; // Base score

  // Distance from heat islands (closer is better for parks, worse for buildings)
  const heatFactor = Math.sin(location.lat * 50) * Math.cos(location.lng * 50);
  if (projectType === 'park') {
    score += heatFactor * 30; // Parks should be in hot areas to provide cooling
  } else {
    score -= heatFactor * 15; // Buildings should avoid hottest areas
  }

  // Air quality considerations
  const airQualityFactor = Math.cos(location.lat * 40) * Math.sin(location.lng * 40);
  if (projectType === 'park') {
    score += airQualityFactor * 25; // Parks improve air quality where it's poor
  } else if (projectType === 'hospital') {
    score -= airQualityFactor * 20; // Hospitals need clean air
  }

  // Water runoff considerations
  const drainageFactor = Math.sin(location.lat * 30 + location.lng * 30);
  if (projectType === 'park') {
    score += drainageFactor * 20; // Parks help with water management
  }

  return Math.max(0, Math.min(100, score));
};

// Calculate social impact score
const calculateSocialScore = (location, projectType, distance) => {
  let score = 50; // Base score

  // Population density simulation
  const populationDensity = Math.abs(Math.sin(location.lat * 60) * Math.cos(location.lng * 60)) * 100;
  
  if (projectType === 'park' || projectType === 'school') {
    score += populationDensity * 0.3; // Higher density areas need more parks/schools
  } else if (projectType === 'residential') {
    score -= populationDensity * 0.4; // Avoid displacing people in dense areas
  }

  // Accessibility to existing amenities
  const amenityAccess = Math.cos(location.lat * 45) * Math.sin(location.lng * 45) * 50 + 50;
  score += amenityAccess * 0.2;

  // Community displacement risk
  const displacementRisk = Math.abs(Math.sin(location.lat * 70)) * 50;
  if (projectType === 'commercial' || projectType === 'residential') {
    score -= displacementRisk * 0.8; // Minimize displacement for development projects
  }

  return Math.max(0, Math.min(100, score));
};

// Calculate infrastructure readiness score
const calculateInfrastructureScore = (location, projectType, distance) => {
  let score = 50; // Base score

  // Transportation access simulation
  const transportAccess = Math.abs(Math.cos(location.lat * 35) * Math.sin(location.lng * 35)) * 100;
  
  if (projectType === 'transport') {
    score += transportAccess * 0.5; // Transport hubs need good existing access
  } else if (projectType === 'hospital' || projectType === 'school') {
    score += transportAccess * 0.3; // Essential services need accessibility
  }

  // Traffic impact
  const trafficDensity = Math.abs(Math.sin(location.lat * 55) * Math.cos(location.lng * 55)) * 100;
  if (projectType !== 'park') {
    score -= trafficDensity * 0.3; // Most projects should minimize traffic impact
  }

  // Utility availability
  const utilityAccess = Math.cos(location.lat * 25 + location.lng * 25) * 50 + 50;
  if (projectType === 'residential' || projectType === 'commercial') {
    score += utilityAccess * 0.4;
  }

  return Math.max(0, Math.min(100, score));
};

// Calculate economic feasibility score
const calculateEconomicScore = (location, projectType, projectSize, distance) => {
  let score = 50; // Base score

  // Land cost simulation (inverse of population density)
  const landCost = Math.abs(Math.sin(location.lat * 60) * Math.cos(location.lng * 60)) * 100;
  score -= landCost * 0.3; // Lower land costs are better

  // Development cost based on distance from center
  const developmentCost = distance * 1000; // Distance-based cost
  score -= developmentCost * 0.1;

  // Size efficiency
  const sizeEfficiency = Math.min(100, (parseInt(projectSize) || 500) / 10);
  score += sizeEfficiency * 0.1;

  // Economic impact potential
  if (projectType === 'commercial') {
    const commercialPotential = Math.cos(location.lat * 40) * Math.sin(location.lng * 40) * 50 + 50;
    score += commercialPotential * 0.3;
  }

  return Math.max(0, Math.min(100, score));
};

// Calculate overall score based on optimization factors
const calculateOverallScore = (scores, factors) => {
  const weights = {
    environmental: parseFloat(factors.environmental === 'high' ? 0.4 : factors.environmental === 'medium' ? 0.25 : 0.1),
    social: parseFloat(factors.social === 'high' ? 0.4 : factors.social === 'medium' ? 0.25 : 0.1),
    infrastructure: parseFloat(factors.infrastructure === 'high' ? 0.4 : factors.infrastructure === 'medium' ? 0.25 : 0.1),
    economic: parseFloat(factors.economic === 'high' ? 0.4 : factors.economic === 'medium' ? 0.25 : 0.1)
  };

  const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0);

  return (
    (scores.environmentalScore * weights.environmental +
     scores.socialScore * weights.social +
     scores.infrastructureScore * weights.infrastructure +
     scores.economicScore * weights.economic) / totalWeight
  );
};

// Helper functions
const getMarkerType = (score) => {
  if (score >= 80) return 'excellent';
  if (score >= 60) return 'good';
  if (score >= 40) return 'fair';
  return 'poor';
};

const getEfficiencyRating = (score) => {
  if (score >= 75) return 'high';
  if (score >= 50) return 'medium';
  return 'low';
};

function App() {
  // Optimization state
  const [projectType, setProjectType] = useState('park');
  const [projectSize, setProjectSize] = useState('');
  const [optimizationFactors, setOptimizationFactors] = useState({
    environmental: 'high',
    social: 'high', 
    infrastructure: 'medium',
    economic: 'medium'
  });
  const [recommendedSites, setRecommendedSites] = useState([]);
  const [isOptimizing, setIsOptimizing] = useState(false);
  
  // Existing state
  const [currentScenario, setCurrentScenario] = useState('current');
  const [activeOverlays, setActiveOverlays] = useState(['heat', 'green']);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [customLocations, setCustomLocations] = useState([]);
  const [showLocationForm, setShowLocationForm] = useState(false);
  const [mapCenter, setMapCenter] = useState([42.3601, -71.0589]);
  const [mapZoom, setMapZoom] = useState(13);

  // Handle location optimization
  const handleOptimizeLocations = async () => {
    if (!projectSize) return;
    
    setIsOptimizing(true);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const optimizedLocations = optimizeLocations(
      projectType, 
      projectSize, 
      mapCenter, 
      optimizationFactors
    );
    
    setRecommendedSites(optimizedLocations);
    setIsOptimizing(false);
  };

  // Get all markers to display
  const allMarkers = [...customLocations, ...recommendedSites];

  // Create custom icon based on marker type
  const createCustomIcon = (markerType, isRecommended = false) => {
    let color = '#3B82F6'; // Default blue
    
    if (isRecommended) {
      switch (markerType) {
        case 'excellent':
          color = '#10B981'; // Green
          break;
        case 'good':
          color = '#F59E0B'; // Yellow
          break;
        case 'fair':
          color = '#F97316'; // Orange
          break;
        case 'poor':
          color = '#EF4444'; // Red
          break;
      }
    }

    return L.divIcon({
      html: `<div style="background-color: ${color}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.3);"></div>`,
      iconSize: [12, 12],
      className: 'custom-marker'
    });
  };

  // Overlay options
  const overlayOptions = [
    { id: 'heat', label: 'Heat Islands', desc: 'Urban temperature zones', color: 'bg-red-500' },
    { id: 'green', label: 'Green Spaces', desc: 'Parks and vegetation', color: 'bg-green-500' },
    { id: 'traffic', label: 'Traffic Density', desc: 'Transportation patterns', color: 'bg-blue-500' }
  ];

  return (
    <div className="h-screen flex bg-gray-50">
      {/* Left Sidebar */}
      <div className="w-80 bg-white shadow-lg overflow-y-auto">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">
              Green Planner
            </h1>
            <p className="text-gray-600">
              Find optimal locations for sustainable development
            </p>
          </div>

          {/* Project Configuration */}
          <div>
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center">
              <MapIcon />
              <span className="ml-2">Project Details</span>
            </h3>
            
            {/* Project Type Selector */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                What are you building?
              </label>
              <select 
                value={projectType}
                onChange={(e) => setProjectType(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="park">Park / Green Space</option>
                <option value="residential">Residential Building</option>
                <option value="commercial">Commercial Building</option>
                <option value="school">School / Educational</option>
                <option value="hospital">Healthcare Facility</option>
                <option value="transport">Transportation Hub</option>
              </select>
            </div>

            {/* Size Input */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Project Size (sq m)
              </label>
              <input
                type="number"
                value={projectSize}
                onChange={(e) => setProjectSize(e.target.value)}
                placeholder="500"
                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              />
              <div className="text-xs text-gray-500 mt-1">
                Example: Small park ~500 sq m, Building ~1000 sq m
              </div>
            </div>

            {/* Optimization Priorities */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Optimization Priorities
              </label>
              
              {Object.entries(optimizationFactors).map(([key, value]) => (
                <div key={key} className="mb-2">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-medium text-gray-600 capitalize">
                      {key === 'environmental' && '🌱 Environmental'}
                      {key === 'social' && '👥 Social Impact'}
                      {key === 'infrastructure' && '🏗️ Infrastructure'}
                      {key === 'economic' && '💰 Economic'}
                    </span>
                    <span className="text-xs text-gray-500 capitalize">{value}</span>
                  </div>
                  <select
                    value={value}
                    onChange={(e) => setOptimizationFactors(prev => ({
                      ...prev,
                      [key]: e.target.value
                    }))}
                    className="w-full p-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
                  </select>
                </div>
              ))}
            </div>

            {/* Find Locations Button */}
            <button 
              onClick={handleOptimizeLocations}
              disabled={isOptimizing || !projectSize}
              className="w-full p-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors mb-6 font-medium disabled:bg-gray-400"
            >
              {isOptimizing ? '🔄 Analyzing...' : '🎯 Find Optimal Locations'}
            </button>
          </div>

          {/* Map Overlays */}
          <div>
            <h3 className="font-semibold text-gray-800 mb-3 flex items-center">
              <LayersIcon />
              <span className="ml-2">Map Overlays</span>
            </h3>
            
            <div className="space-y-2">
              {overlayOptions.map(overlay => (
                <label key={overlay.id} className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={activeOverlays.includes(overlay.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setActiveOverlays(prev => [...prev, overlay.id]);
                      } else {
                        setActiveOverlays(prev => prev.filter(id => id !== overlay.id));
                      }
                    }}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div className={`w-4 h-4 rounded ${overlay.color}`}></div>
                  <div>
                    <div className="text-sm font-medium text-gray-700">{overlay.label}</div>
                    <div className="text-xs text-gray-500">{overlay.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Recommendations Results */}
          {recommendedSites.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-800 mb-3 flex items-center">
                <BarChartIcon />
                <span className="ml-2">Recommended Sites</span>
              </h3>
              
              <div className="space-y-3">
                {recommendedSites.map((site, index) => (
                  <div key={site.id} className="p-3 bg-gray-50 rounded-lg border">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">Site #{site.rank}</span>
                      <div className={`px-2 py-1 rounded text-xs font-medium ${
                        site.overallScore >= 80 ? 'bg-green-100 text-green-800' :
                        site.overallScore >= 60 ? 'bg-yellow-100 text-yellow-800' :
                        site.overallScore >= 40 ? 'bg-orange-100 text-orange-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        Score: {site.overallScore.toFixed(0)}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-gray-600">Environmental:</span>
                        <span className="font-medium ml-1">{site.environmentalScore.toFixed(0)}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Social:</span>
                        <span className="font-medium ml-1">{site.socialScore.toFixed(0)}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Infrastructure:</span>
                        <span className="font-medium ml-1">{site.infrastructureScore.toFixed(0)}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Economic:</span>
                        <span className="font-medium ml-1">{site.economicScore.toFixed(0)}</span>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => {
                        setMapCenter(site.position);
                        setMapZoom(16);
                      }}
                      className="w-full mt-2 p-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors"
                    >
                      View on Map
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Analysis Explanation */}
          {recommendedSites.length > 0 && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Why These Locations?</h4>
              <div className="text-sm text-blue-800 space-y-1">
                {projectType === 'park' && (
                  <>
                    <p>• Parks placed in areas needing air quality improvement</p>
                    <p>• Located to provide cooling in urban heat islands</p>
                    <p>• Positioned to manage stormwater runoff</p>
                  </>
                )}
                {projectType === 'residential' && (
                  <>
                    <p>• Minimizes displacement of existing communities</p>
                    <p>• Avoids high-density areas to reduce crowding</p>
                    <p>• Close to transportation and amenities</p>
                  </>
                )}
                {projectType === 'commercial' && (
                  <>
                    <p>• Balances economic potential with social impact</p>
                    <p>• Considers traffic flow and accessibility</p>
                    <p>• Minimizes displacement risk</p>
                  </>
                )}
                {projectType === 'school' && (
                  <>
                    <p>• Located in underserved high-density areas</p>
                    <p>• Accessible via public transportation</p>
                    <p>• Away from pollution sources</p>
                  </>
                )}
                {projectType === 'hospital' && (
                  <>
                    <p>• Prioritizes clean air and low pollution</p>
                    <p>• Excellent transportation access</p>
                    <p>• Serves population-dense areas</p>
                  </>
                )}
                {projectType === 'transport' && (
                  <>
                    <p>• Connects to existing transportation networks</p>
                    <p>• Minimizes additional traffic congestion</p>
                    <p>• Serves high-demand areas</p>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Map Area */}
      <div className="flex-1 relative" style={{ minHeight: '400px' }}>
        <MapContainer
          center={mapCenter}
          zoom={mapZoom}
          style={{ height: '100%', width: '100%' }}
          className="z-0"
          key={`${mapCenter[0]}-${mapCenter[1]}-${mapZoom}`}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {/* Map overlay effects */}
          <MapOverlays 
            activeOverlays={activeOverlays} 
            currentScenario={currentScenario} 
            mapCenter={mapCenter}
          />
          
          {/* Recommended site markers */}
          {recommendedSites.map(site => (
            <Marker 
              key={site.id} 
              position={site.position}
              icon={createCustomIcon(site.type, true)}
            >
              <Popup>
                <div className="p-2 min-w-[200px]">
                  <h3 className="font-semibold text-gray-800 mb-2">
                    {site.title} 
                    <span className="ml-2 text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      Rank #{site.rank}
                    </span>
                  </h3>
                  
                  <div className="mb-3">
                    <div className="text-sm font-medium text-gray-700 mb-1">
                      Overall Score: {site.overallScore.toFixed(1)}/100
                    </div>
                    <div className={`w-full bg-gray-200 rounded-full h-2 ${
                      site.overallScore >= 80 ? 'bg-green-200' :
                      site.overallScore >= 60 ? 'bg-yellow-200' :
                      site.overallScore >= 40 ? 'bg-orange-200' :
                      'bg-red-200'
                    }`}>
                      <div 
                        className={`h-2 rounded-full ${
                          site.overallScore >= 80 ? 'bg-green-500' :
                          site.overallScore >= 60 ? 'bg-yellow-500' :
                          site.overallScore >= 40 ? 'bg-orange-500' :
                          'bg-red-500'
                        }`}
                        style={{ width: `${site.overallScore}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                    <div className="bg-green-50 p-2 rounded">
                      <div className="text-green-700 font-medium">Environmental</div>
                      <div className="text-green-800 font-bold">{site.environmentalScore.toFixed(0)}</div>
                    </div>
                    <div className="bg-blue-50 p-2 rounded">
                      <div className="text-blue-700 font-medium">Social</div>
                      <div className="text-blue-800 font-bold">{site.socialScore.toFixed(0)}</div>
                    </div>
                    <div className="bg-purple-50 p-2 rounded">
                      <div className="text-purple-700 font-medium">Infrastructure</div>
                      <div className="text-purple-800 font-bold">{site.infrastructureScore.toFixed(0)}</div>
                    </div>
                    <div className="bg-yellow-50 p-2 rounded">
                      <div className="text-yellow-700 font-medium">Economic</div>
                      <div className="text-yellow-800 font-bold">{site.economicScore.toFixed(0)}</div>
                    </div>
                  </div>

                  <div className="text-xs text-gray-600 mb-2">
                    Project: {projectType.charAt(0).toUpperCase() + projectType.slice(1)} ({projectSize} sq m)
                  </div>

                  <div className="text-xs text-gray-600">
                    Coordinates: {site.lat.toFixed(4)}, {site.lng.toFixed(4)}
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Custom location markers */}
          {customLocations.map(marker => (
            <Marker 
              key={marker.id} 
              position={marker.position}
              icon={createCustomIcon('custom', false)}
            >
              <Popup>
                <div className="p-2">
                  <h3 className="font-semibold text-gray-800">{marker.title}</h3>
                  <p className="text-sm text-gray-600">Type: {marker.type}</p>
                  <p className="text-sm text-gray-600">Efficiency: {marker.efficiency}</p>
                  <button
                    onClick={() => {
                      setCustomLocations(prev => prev.filter(loc => loc.id !== marker.id));
                    }}
                    className="mt-2 px-3 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600"
                  >
                    Delete Location
                  </button>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        {/* Legend */}
        <div className="absolute bottom-4 right-4 bg-white rounded-lg shadow-lg p-4 z-10 max-w-xs">
          <h4 className="font-semibold text-gray-800 mb-2">Legend</h4>
          <div className="space-y-2 text-sm">
            {recommendedSites.length > 0 && (
              <>
                <div className="font-medium text-gray-700 mb-1">Recommended Sites:</div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span>Excellent (80-100)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span>Good (60-79)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                  <span>Fair (40-59)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span>Poor (0-39)</span>
                </div>
                <hr className="my-2" />
              </>
            )}
            
            <div className="font-medium text-gray-700 mb-1">Map Overlays:</div>
            {activeOverlays.includes('heat') && (
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-red-400 rounded opacity-60"></div>
                <span>Heat Islands</span>
              </div>
            )}
            {activeOverlays.includes('green') && (
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-400 rounded opacity-60"></div>
                <span>Green Spaces</span>
              </div>
            )}
            {activeOverlays.includes('traffic') && (
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-400 rounded opacity-60"></div>
                <span>Traffic Density</span>
              </div>
            )}
          </div>
        </div>

        {/* Instructions Overlay */}
        {recommendedSites.length === 0 && !isOptimizing && (
          <div className="absolute top-4 left-4 right-4 bg-white rounded-lg shadow-lg p-4 z-10 max-w-md mx-auto">
            <div className="text-center">
              <MapPinIcon />
              <h3 className="text-lg font-semibold text-gray-800 mt-2 mb-2">
                Find Your Optimal Building Site
              </h3>
              <p className="text-gray-600 text-sm mb-4">
                Configure your project details in the sidebar and click "Find Optimal Locations" 
                to get AI-powered recommendations based on environmental, social, infrastructure, 
                and economic factors.
              </p>
              <div className="grid grid-cols-2 gap-3 text-xs text-gray-600">
                <div>
                  <div className="font-medium text-green-700">🌱 Environmental</div>
                  <div>Air quality, heat islands, water management</div>
                </div>
                <div>
                  <div className="font-medium text-blue-700">👥 Social</div>
                  <div>Community impact, displacement, accessibility</div>
                </div>
                <div>
                  <div className="font-medium text-purple-700">🏗️ Infrastructure</div>
                  <div>Transportation, utilities, traffic</div>
                </div>
                <div>
                  <div className="font-medium text-yellow-700">💰 Economic</div>
                  <div>Land costs, development feasibility</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;