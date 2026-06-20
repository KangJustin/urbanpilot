import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import {
  Layers, ThermometerSun, Bike, Building2,
  CheckCircle2, Loader2, Clock, AlertTriangle,
  Sparkles, BarChart3, TreePine, TrendingUp, Copy, Check,
  Sun, Cloud, CloudRain, CloudSnow, CloudLightning, CloudFog,
  Send, MessageCircle,
} from 'lucide-react';
import berkeleyData from './mock/berkeleyAnalysis.json';
import { analyzeNeighborhood, generateVisualization, getConditions, askQuestion } from './services/analysisApi';
import LocationSearch from './components/LocationSearch';
import PresentDayView from './components/PresentDayView';
import ReferenceImageInput from './components/ReferenceImageInput';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Placeholder shown before the user searches for a location. Never re-substituted after a
// real place is selected — see selectedLocation state in App().
const DEFAULT_LOCATION = {
  placeId: null,
  displayName: 'Downtown Berkeley, CA',
  formattedAddress: 'Downtown Berkeley, CA',
  latitude: 37.8703,
  longitude: -122.2677,
};

const AGENTS = [
  { id: 'coordinator', label: 'Coordinator' },
  { id: 'climate', label: 'Climate Agent' },
  { id: 'accessibility', label: 'Accessibility Agent' },
  { id: 'housing', label: 'Housing Agent' },
  { id: 'urban_design', label: 'Urban Design Agent' },
];

const COST_COLORS = { low: 'text-emerald-400', medium: 'text-amber-400', high: 'text-rose-400' };
const SEVERITY_COLORS = [null, 'bg-emerald-500', 'bg-emerald-400', 'bg-amber-400', 'bg-rose-400', 'bg-rose-600'];

// WMO weather codes -> icon, per https://open-meteo.com/en/docs
function weatherIcon(code) {
  if (code === 0) return Sun;
  if ([1, 2, 3].includes(code)) return Cloud;
  if ([45, 48].includes(code)) return CloudFog;
  if (code >= 51 && code <= 67) return CloudRain;
  if (code >= 71 && code <= 77) return CloudSnow;
  if (code >= 80 && code <= 99) return CloudLightning;
  return Cloud;
}

function aqiCategory(aqi) {
  if (aqi == null) return null;
  if (aqi <= 50) return { label: 'Good', color: 'text-emerald-400' };
  if (aqi <= 100) return { label: 'Moderate', color: 'text-amber-400' };
  if (aqi <= 150) return { label: 'Unhealthy (SG)', color: 'text-orange-400' };
  if (aqi <= 200) return { label: 'Unhealthy', color: 'text-rose-400' };
  return { label: 'Very Unhealthy', color: 'text-purple-400' };
}

function severityLabel(severity) {
  if (severity >= 4) return { label: 'High', color: 'text-rose-400' };
  if (severity === 3) return { label: 'Moderate', color: 'text-amber-400' };
  return { label: 'Low', color: 'text-emerald-400' };
}

function getHeatRisk(climate) {
  if (!climate) return null;
  const risk = climate.risks?.find(r => /heat/i.test(r.title));
  if (risk) return severityLabel(risk.severity);
  if (climate.score >= 70) return { label: 'Low', color: 'text-emerald-400' };
  if (climate.score >= 50) return { label: 'Moderate', color: 'text-amber-400' };
  return { label: 'High', color: 'text-rose-400' };
}

function getFloodRisk(climate) {
  if (!climate) return null;
  const risk = climate.risks?.find(r => /flood|stormwater|runoff/i.test(r.title));
  return risk ? severityLabel(risk.severity) : { label: 'Low', color: 'text-emerald-400' };
}

// The decorative intervention pins/overlay circles use real Downtown Berkeley street
// coordinates and can't be procedurally generated for an arbitrary address — only show them
// when the selected location actually is Berkeley.
function isBerkeleyLocation(location) {
  const text = `${location?.displayName || ''} ${location?.formattedAddress || ''}`.toLowerCase();
  return text.includes('berkeley');
}

function StatBadge({ label, value, color }) {
  return (
    <div className="text-right shrink-0">
      <div className="text-[10px] text-slate-500 leading-tight">{label}</div>
      <div className={`text-xs font-semibold leading-tight ${color}`}>{value}</div>
    </div>
  );
}

// Precise Downtown Berkeley overlay coordinates
const OVERLAYS = {
  today: {
    heat: [
      { center: [37.8651, -122.2591], radius: 280, color: '#ef4444', opacity: 0.22 },
      { center: [37.8697, -122.2671], radius: 220, color: '#f97316', opacity: 0.18 },
      { center: [37.8668, -122.2595], radius: 170, color: '#f59e0b', opacity: 0.15 },
    ],
    green: [
      { center: [37.8713, -122.2696], radius: 150, color: '#22c55e', opacity: 0.38 },
      { center: [37.8752, -122.2723], radius: 110, color: '#4ade80', opacity: 0.32 },
    ],
    traffic: [
      { center: [37.8702, -122.2679], radius: 240, color: '#38bdf8', opacity: 0.18 },
      { center: [37.8697, -122.2671], radius: 160, color: '#7dd3fc', opacity: 0.13 },
    ],
  },
  '2040': {
    heat: [
      { center: [37.8651, -122.2591], radius: 150, color: '#f97316', opacity: 0.11 },
      { center: [37.8697, -122.2671], radius: 110, color: '#f59e0b', opacity: 0.08 },
    ],
    green: [
      { center: [37.8713, -122.2696], radius: 240, color: '#22c55e', opacity: 0.42 },
      { center: [37.8752, -122.2723], radius: 180, color: '#4ade80', opacity: 0.36 },
      { center: [37.8651, -122.2591], radius: 160, color: '#86efac', opacity: 0.30 },
      { center: [37.8668, -122.2595], radius: 140, color: '#4ade80', opacity: 0.28 },
      { center: [37.8697, -122.2671], radius: 170, color: '#22c55e', opacity: 0.25 },
    ],
    traffic: [
      { center: [37.8702, -122.2679], radius: 310, color: '#38bdf8', opacity: 0.22 },
      { center: [37.8697, -122.2671], radius: 220, color: '#7dd3fc', opacity: 0.18 },
      { center: [37.8651, -122.2591], radius: 160, color: '#bae6fd', opacity: 0.14 },
    ],
  },
};

// Intervention sites shown on map after analysis
const INTERVENTIONS = [
  {
    id: 'housing-bart',
    pos: [37.8700, -122.2679],
    label: 'Transit-Oriented Housing',
    sub: '500–800 units near BART',
    callout: '+650 units',
    dot: '#f59e0b', ring: '#78350f',
    showLabel: true,
  },
  {
    id: 'transit-hub',
    pos: [37.8704, -122.2683],
    label: 'Transit Hub Upgrade',
    sub: 'Downtown Berkeley BART station',
    callout: '+ Access & connectivity',
    dot: '#38bdf8', ring: '#0c4a6e',
    showLabel: false,
  },
  {
    id: 'housing-center',
    pos: [37.8710, -122.2668],
    label: 'Mixed-Use Infill',
    sub: 'Center St & Shattuck',
    callout: 'Higher density',
    dot: '#f59e0b', ring: '#78350f',
    showLabel: false,
  },
  {
    id: 'trees-telegraph',
    pos: [37.8651, -122.2591],
    label: 'Street Tree Planting',
    sub: 'Telegraph Ave corridor',
    callout: 'Reduces heat by 3°F',
    dot: '#4ade80', ring: '#14532d',
    showLabel: true,
  },
  {
    id: 'bioswale',
    pos: [37.8723, -122.2706],
    label: 'Green Infrastructure',
    sub: 'Civic Center bioswale + permeable paving',
    callout: '+1.2 mi tree cover',
    dot: '#4ade80', ring: '#14532d',
    showLabel: true,
  },
  {
    id: 'ada',
    pos: [37.8697, -122.2681],
    label: 'ADA Crossing Upgrades',
    sub: '12 priority intersections',
    callout: '+42% accessibility',
    dot: '#a78bfa', ring: '#2e1065',
    showLabel: false,
  },
];

const BIKE_CORRIDOR = [
  [37.8695, -122.2730],
  [37.8695, -122.2710],
  [37.8695, -122.2688],
  [37.8695, -122.2660],
  [37.8695, -122.2640],
];

function makeInterventionIcon(dot, ring, label, callout, showLabel) {
  if (!showLabel) {
    return L.divIcon({
      html: `<div style="width:26px;height:26px;border-radius:50%;background:${ring};border:2px solid ${dot};display:flex;align-items:center;justify-content:center;box-shadow:0 0 10px ${dot}55">
        <div style="width:8px;height:8px;background:${dot};border-radius:50%"></div>
      </div>`,
      iconSize: [26, 26],
      iconAnchor: [13, 13],
      className: '',
    });
  }
  return L.divIcon({
    html: `<div style="position:relative;width:230px;height:44px;">
      <div style="position:absolute;left:0;top:9px;width:26px;height:26px;border-radius:50%;background:${ring};border:2px solid ${dot};display:flex;align-items:center;justify-content:center;box-shadow:0 0 10px ${dot}55">
        <div style="width:8px;height:8px;background:${dot};border-radius:50%"></div>
      </div>
      <div style="position:absolute;left:34px;top:1px;background:rgba(15,23,42,0.92);border:1px solid ${dot}55;border-radius:8px;padding:4px 9px;white-space:nowrap;backdrop-filter:blur(4px);font-family:system-ui,-apple-system,sans-serif;">
        <div style="font-size:11px;font-weight:700;color:${dot};line-height:1.3">${label}</div>
        <div style="font-size:9.5px;color:#94a3b8;line-height:1.3">${callout}</div>
      </div>
    </div>`,
    iconSize: [230, 44],
    iconAnchor: [13, 22],
    className: '',
  });
}

function MapOverlays({ activeOverlays, mapScenario }) {
  const data = OVERLAYS[mapScenario] || OVERLAYS.today;
  return (
    <>
      {activeOverlays.includes('heat') && data.heat.map((z, i) => (
        <Circle key={`h${i}`} center={z.center} radius={z.radius}
          pathOptions={{ color: z.color, fillColor: z.color, fillOpacity: z.opacity, weight: 1, opacity: z.opacity * 2 }} />
      ))}
      {activeOverlays.includes('green') && data.green.map((z, i) => (
        <Circle key={`g${i}`} center={z.center} radius={z.radius}
          pathOptions={{ color: z.color, fillColor: z.color, fillOpacity: z.opacity, weight: 1, opacity: z.opacity + 0.15 }} />
      ))}
      {activeOverlays.includes('traffic') && data.traffic.map((z, i) => (
        <Circle key={`t${i}`} center={z.center} radius={z.radius}
          pathOptions={{ color: z.color, fillColor: z.color, fillOpacity: z.opacity, weight: 1, opacity: z.opacity + 0.1 }} />
      ))}
    </>
  );
}

function InterventionLayer({ visible }) {
  if (!visible) return null;
  return (
    <>
      <Polyline
        positions={BIKE_CORRIDOR}
        pathOptions={{ color: '#38bdf8', weight: 4, opacity: 0.85, dashArray: '8 4' }}
      />
      {INTERVENTIONS.map(s => (
        <Marker key={s.id} position={s.pos} icon={makeInterventionIcon(s.dot, s.ring, s.label, s.callout, s.showLabel)}>
          <Popup>
            <div style={{ fontFamily: 'system-ui', minWidth: 160 }}>
              <div style={{ fontWeight: 700, color: s.dot, marginBottom: 3 }}>{s.label}</div>
              <div style={{ fontSize: 12, color: '#94a3b8' }}>{s.sub}</div>
            </div>
          </Popup>
        </Marker>
      ))}
    </>
  );
}

// react-leaflet's MapContainer center/zoom props only apply on first mount; recenter
// explicitly whenever the selected location changes.
function RecenterMap({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, map, zoom]);
  return null;
}

function ScoreRing({ label, score, icon: Icon, color, stroke }) {
  const r = 22;
  const circ = 2 * Math.PI * r;
  const filled = (score / 100) * circ;
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative w-14 h-14">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 56 56">
          <circle cx="28" cy="28" r={r} fill="none" stroke="#1e293b" strokeWidth="5" />
          <circle cx="28" cy="28" r={r} fill="none" stroke={stroke} strokeWidth="5"
            strokeDasharray={`${filled} ${circ}`} strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 0.8s ease' }} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-sm font-bold ${color}`}>{score}</span>
        </div>
      </div>
      <div className={`flex items-center gap-1 text-xs ${color} opacity-70`}>
        <Icon className="w-3 h-3" />
        {label}
      </div>
    </div>
  );
}

function AgentRow({ label, status }) {
  return (
    <div className="flex items-center gap-2.5 py-1.5">
      {status === 'done' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
      {status === 'running' && <Loader2 className="w-4 h-4 text-sky-400 animate-spin shrink-0" />}
      {(status === 'queued' || !status) && <Clock className="w-4 h-4 text-slate-600 shrink-0" />}
      <span className={`text-sm ${status === 'running' ? 'text-sky-300' : status === 'done' ? 'text-white' : 'text-slate-500'}`}>
        {label}
      </span>
      {status === 'running' && <span className="text-xs text-sky-400 ml-auto animate-pulse">Analyzing…</span>}
      {status === 'done' && <span className="text-xs text-emerald-500 ml-auto">Done</span>}
    </div>
  );
}

function RiskItem({ risk }) {
  return (
    <div className="flex gap-3 py-2 border-b border-slate-800/60 last:border-0">
      <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${SEVERITY_COLORS[risk.severity] || 'bg-slate-500'}`} />
      <div>
        <div className="text-sm font-medium text-white">{risk.title}</div>
        <div className="text-xs text-slate-400 mt-0.5 leading-relaxed">{risk.description}</div>
      </div>
    </div>
  );
}

function RecommendationCard({ rec }) {
  const cat = rec.id?.startsWith('cr') ? 'climate' : rec.id?.startsWith('ar') ? 'accessibility' : 'housing';
  const styles = {
    climate: { border: 'border-emerald-900', accent: 'text-emerald-400', icon: <TreePine className="w-3 h-3" /> },
    accessibility: { border: 'border-sky-900', accent: 'text-sky-400', icon: <Bike className="w-3 h-3" /> },
    housing: { border: 'border-amber-900', accent: 'text-amber-400', icon: <Building2 className="w-3 h-3" /> },
  }[cat] || { border: 'border-slate-700', accent: 'text-slate-400', icon: null };

  return (
    <div className={`rounded-lg border ${styles.border} bg-slate-800/30 p-3 mb-2`}>
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-1.5">
          <span className={styles.accent}>{styles.icon}</span>
          <span className="text-sm font-medium text-white">{rec.title}</span>
        </div>
        <span className={`text-xs shrink-0 ${COST_COLORS[rec.cost] || 'text-slate-400'}`}>{rec.cost}</span>
      </div>
      <p className="text-xs text-slate-400 leading-relaxed mb-2">{rec.description}</p>
      {rec.timeline && (
        <span className="text-xs text-slate-600 bg-slate-800 px-2 py-0.5 rounded-full">
          {rec.timeline.replace('_', ' ')}
        </span>
      )}
    </div>
  );
}

const INTERVENTION_IMAGES = [
  { match: /tree canopy|street tree/i, img: '/images/interventions/tree-canopy.jpg' },
  { match: /bioswale|permeable|green infrastructure|stormwater/i, img: '/images/interventions/permeable-streets.jpg' },
  { match: /ada|crossing|accessib/i, img: '/images/interventions/ada-crossing.jpg' },
  { match: /bike|bicycle|cycling/i, img: '/images/interventions/transit-expansion.jpg' },
  { match: /transit-oriented|mixed-use housing|affordable housing/i, img: '/images/interventions/affordable-housing.jpg' },
  { match: /infill|small-site|small-lot/i, img: '/images/interventions/infill-housing.jpg' },
];

function getInterventionImage(rec) {
  const text = `${rec.title} ${rec.description}`;
  return INTERVENTION_IMAGES.find(m => m.match.test(text))?.img || null;
}

function InterventionCard({ rec }) {
  const cat = rec.id?.startsWith('cr') ? 'climate' : rec.id?.startsWith('ar') ? 'accessibility' : 'housing';
  const image = getInterventionImage(rec);
  const styles = {
    climate: { icon: <TreePine className="w-5 h-5" />, grad: 'from-emerald-900 to-emerald-950' },
    accessibility: { icon: <Bike className="w-5 h-5" />, grad: 'from-sky-900 to-sky-950' },
    housing: { icon: <Building2 className="w-5 h-5" />, grad: 'from-amber-900 to-amber-950' },
  }[cat];
  const topImpact = Object.entries(rec.impact || {}).sort((a, b) => b[1] - a[1])[0];

  return (
    <div className="shrink-0 w-[140px] rounded-lg overflow-hidden border border-slate-700/60 bg-slate-900">
      <div className={`h-[70px] ${image ? '' : `bg-gradient-to-br ${styles.grad} flex items-center justify-center text-slate-500`}`}>
        {image ? <img src={image} alt={rec.title} className="w-full h-full object-cover" /> : styles.icon}
      </div>
      <div className="p-2">
        <div className="text-[11px] font-semibold text-white leading-tight mb-1 line-clamp-2">{rec.title}</div>
        {topImpact && (
          <div className="text-[10px] text-emerald-400">+{topImpact[1]} {topImpact[0]}</div>
        )}
      </div>
    </div>
  );
}

function ScenarioScoreMini({ label, score }) {
  return (
    <div className="text-center">
      <div className="text-[13px] font-bold text-white leading-tight">{score}</div>
      <div className="text-[9px] text-slate-500 leading-tight">{label}</div>
    </div>
  );
}

function ScenarioCard({ year, scenario, image, selected, onSelect }) {
  if (!scenario) return null;
  return (
    <button
      onClick={onSelect}
      className={`shrink-0 w-[150px] text-left rounded-lg overflow-hidden border transition-colors ${
        selected ? 'border-emerald-500 ring-1 ring-emerald-500/50' : 'border-slate-700/60 hover:border-slate-600'
      }`}>
      <div className="h-[84px] bg-slate-800">
        {image ? (
          <img src={image} alt={`${year} visualization`} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-600">
            <Sparkles className="w-5 h-5" />
          </div>
        )}
      </div>
      <div className="p-2 bg-slate-800/60">
        <div className="text-xs font-bold text-white">{year}</div>
        <div className="text-[10px] text-slate-500 mb-1.5 truncate">{scenario.title?.replace(`${year}: `, '').replace(`Berkeley ${year}: `, '')}</div>
        <div className="grid grid-cols-3 gap-1">
          <ScenarioScoreMini label="Climate" score={scenario.climateScore} />
          <ScenarioScoreMini label="Access" score={scenario.accessibilityScore} />
          <ScenarioScoreMini label="Housing" score={scenario.housingScore} />
        </div>
      </div>
    </button>
  );
}

export default function App() {
  const [goal, setGoal] = useState('');
  const [analysisState, setAnalysisState] = useState('idle');
  const [agentStatuses, setAgentStatuses] = useState({});
  const [activeTab, setActiveTab] = useState('recs');
  const [activeTime, setActiveTime] = useState('today');
  const [activeOverlays, setActiveOverlays] = useState(['heat', 'green']);
  const [results, setResults] = useState(null);
  const [copied, setCopied] = useState(false);
  const [visualizingYear, setVisualizingYear] = useState(null);
  const [visualizedImages, setVisualizedImages] = useState({});
  const [visualizeError, setVisualizeError] = useState(null);
  const [conditions, setConditions] = useState(null);
  const [selectedScenario, setSelectedScenario] = useState('2040');
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(DEFAULT_LOCATION);
  const [analysisError, setAnalysisError] = useState(null);
  const [userVisionText, setUserVisionText] = useState('');
  const [referenceImage, setReferenceImage] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getConditions(selectedLocation.latitude, selectedLocation.longitude)
      .then(c => { if (!cancelled) setConditions(c); })
      .catch(() => { if (!cancelled) setConditions(null); });
    return () => { cancelled = true; };
  }, [selectedLocation]);

  function handleLocationSelected(location) {
    setSelectedLocation(location);
    // A new location invalidates any analysis/scenario/chat state from the previous place.
    setResults(null);
    setAnalysisState('idle');
    setActiveTime('today');
    setVisualizedImages({});
    setVisualizeError(null);
    setSelectedScenario('2040');
    setChatMessages([]);
    setAnalysisError(null);
    setUserVisionText('');
    setReferenceImage(null);
  }

  async function handleGenerateVisualization(basePrompt, year) {
    setVisualizingYear(year);
    setVisualizeError(null);
    const prompt = userVisionText.trim()
      ? `${basePrompt} Additional requested changes: ${userVisionText.trim()}.`
      : basePrompt;
    try {
      const { imageUrl } = await generateVisualization(prompt, referenceImage);
      setVisualizedImages(prev => ({ ...prev, [year]: imageUrl }));
      setSelectedScenario(year);
      setActiveTime(year === '2026' ? 'today' : '2040');
    } catch (err) {
      setVisualizeError(err.message);
    } finally {
      setVisualizingYear(null);
    }
  }

  async function handleAsk(question) {
    const q = question.trim();
    if (!q || chatLoading) return;
    setChatMessages(prev => [...prev, { role: 'user', text: q }]);
    setChatInput('');
    setChatLoading(true);
    try {
      const { answer } = await askQuestion(q, data.site, data);
      setChatMessages(prev => [...prev, { role: 'assistant', text: answer }]);
    } catch (err) {
      setChatMessages(prev => [...prev, { role: 'assistant', text: `Couldn't get an answer: ${err.message}` }]);
    } finally {
      setChatLoading(false);
    }
  }

  function selectScenario(year) {
    setSelectedScenario(year);
    setActiveTime(year === '2026' ? 'today' : '2040');
  }

  // Only use the bundled Berkeley demo content when nothing real has been searched yet.
  // Once a real location is selected, every section (scores, scenarios, the map's 2040/2075
  // image overlay) must stay empty until a fresh analysis actually completes for it — never
  // let the canned Berkeley mock content bleed through under a different address.
  const hasRealData = !!results || !selectedLocation.placeId;
  const baseData = hasRealData ? (results || berkeleyData) : { agents: {}, scenarios: {}, dataDisclosure: {} };
  // Site identity always follows the single source of truth (selectedLocation), even before
  // an analysis has run for it — never let a stale Berkeley site name linger after a new search.
  const data = {
    ...baseData,
    site: selectedLocation.placeId
      ? { name: selectedLocation.displayName || selectedLocation.formattedAddress, center: { latitude: selectedLocation.latitude, longitude: selectedLocation.longitude } }
      : baseData.site,
  };
  const heatRisk = getHeatRisk(data.agents?.climate);
  const floodRisk = getFloodRisk(data.agents?.climate);
  const aqiInfo = aqiCategory(conditions?.aqi);
  const WeatherIcon = weatherIcon(conditions?.weatherCode);
  const allRisks = [
    ...(data.agents?.climate?.risks || []),
    ...(data.agents?.accessibility?.risks || []),
    ...(data.agents?.housing?.risks || []),
  ];
  const allRecs = [
    ...(data.agents?.climate?.recommendations || []),
    ...(data.agents?.accessibility?.recommendations || []),
    ...(data.agents?.housing?.recommendations || []),
  ];

  const handleAnalyze = async () => {
    if (!goal.trim()) return;
    setAnalysisState('running');
    setResults(null);
    setActiveTab('agents');

    const init = {};
    AGENTS.forEach(a => { init[a.id] = 'queued'; });
    setAgentStatuses(init);

    const steps = [
      [0, 'coordinator', 'running'],
      [650, 'coordinator', 'done'],
      [700, 'climate', 'running'],
      [1350, 'climate', 'done'],
      [1400, 'accessibility', 'running'],
      [2050, 'accessibility', 'done'],
      [2100, 'housing', 'running'],
      [2750, 'housing', 'done'],
      [2800, 'urban_design', 'running'],
    ];
    steps.forEach(([ms, agent, status]) => {
      setTimeout(() => setAgentStatuses(prev => ({ ...prev, [agent]: status })), ms);
    });

    let apiResult = null;
    let analyzeFailed = false;
    try {
      [apiResult] = await Promise.all([
        analyzeNeighborhood({
          analysisId: `demo-${Date.now()}`,
          site: {
            name: selectedLocation.displayName || selectedLocation.formattedAddress,
            formattedAddress: selectedLocation.formattedAddress,
            center: { latitude: selectedLocation.latitude, longitude: selectedLocation.longitude },
          },
          goal: { primary: 'mixed_use_development', description: goal, priorities: [] },
          scenarioYears: [2026, 2040],
        }),
        new Promise(resolve => setTimeout(resolve, 3700)),
      ]);
    } catch (err) {
      analyzeFailed = true;
      console.error('Analysis request failed:', err.message);
    }

    setAgentStatuses(prev => ({ ...prev, urban_design: 'done' }));

    if (apiResult) {
      setResults(apiResult);
      setAnalysisError(null);
      setAnalysisState('complete');
      setActiveTab('recs');
    } else if (analyzeFailed && !isBerkeleyLocation(selectedLocation)) {
      // Don't silently fall back to stale Berkeley demo content for a real, different location.
      setAnalysisError('Analysis failed for this location. Please try again.');
      setAnalysisState('idle');
    } else {
      // Preserves the original Berkeley demo's graceful fallback behavior.
      setAnalysisError(null);
      setAnalysisState('complete');
      setActiveTab('recs');
    }
  };

  const toggleOverlay = (id) => {
    setActiveOverlays(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const OVERLAY_OPTIONS = [
    { id: 'heat', label: 'Heat', color: 'bg-rose-500' },
    { id: 'green', label: 'Canopy', color: 'bg-emerald-500' },
    { id: 'traffic', label: 'Transit', color: 'bg-sky-500' },
  ];

  const RESULT_TABS = [
    { id: 'recs', label: 'Plan' },
    { id: 'risks', label: 'Risks' },
    { id: 'scenarios', label: 'Future' },
    { id: 'ask', label: 'Ask AI' },
  ];

  const SCENARIO_YEARS = ['2026', '2040', '2075'];

  const SUGGESTED_QUESTIONS = [
    'How will this area handle extreme heat?',
    'What is the impact of increasing density here?',
    'Which recommendation has the biggest equity benefit?',
    'What are the biggest risks if we do nothing?',
  ];

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-slate-950">
      {/* Top bar */}
      <div className="shrink-0 border-b border-slate-800 bg-slate-900 px-5 py-3 flex items-center gap-5 overflow-x-auto">
        <div className="flex items-center gap-2 shrink-0">
          <Sparkles className="w-5 h-5 text-emerald-400" />
          <span className="text-sm font-bold text-white tracking-tight">UrbanPilot</span>
        </div>
        <div className="w-px h-8 bg-slate-700 shrink-0" />
        <div className="shrink-0">
          <div className="text-sm font-bold text-white leading-tight">{data.site?.name}</div>
          <div className="text-[11px] text-slate-500 leading-tight">
            {data.site?.areaKm2 != null && `Area: ${data.site.areaKm2} km²`}
            {data.site?.areaKm2 != null && data.site?.population != null && ' · '}
            {data.site?.population != null && `Population: ${data.site.population.toLocaleString()}`}
          </div>
        </div>

        <div className="flex items-center gap-5 ml-auto shrink-0">
          {conditions?.temperatureF != null && (
            <div className="flex items-center gap-1.5 text-sm text-slate-200 shrink-0">
              <WeatherIcon className="w-4 h-4 text-amber-300" />
              {Math.round(conditions.temperatureF)}°F
            </div>
          )}
          {aqiInfo && (
            <StatBadge label="Air Quality" value={`${aqiInfo.label} · ${conditions.aqi} AQI`} color={aqiInfo.color} />
          )}
          {heatRisk && <StatBadge label="Heat Risk" value={heatRisk.label} color={heatRisk.color} />}
          {floodRisk && <StatBadge label="Flood Risk" value={floodRisk.label} color={floodRisk.color} />}
          <div className="flex items-center gap-1.5 bg-emerald-900/40 border border-emerald-700/50 rounded-full px-2.5 py-1 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] font-medium text-emerald-400">Live Data</span>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
      {/* Sidebar */}
      <div className="w-[380px] bg-slate-900 border-r border-slate-800 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Location search */}
          <LocationSearch onLocationSelected={handleLocationSelected} />

          {/* Present-day view */}
          <PresentDayView location={selectedLocation} />

          {/* Overlays */}
          <div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-2">
              <Layers className="w-3.5 h-3.5" /> Overlays
            </div>
            <div className="flex gap-2">
              {OVERLAY_OPTIONS.map(o => (
                <button key={o.id} onClick={() => toggleOverlay(o.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                    activeOverlays.includes(o.id)
                      ? 'bg-slate-700 border-slate-600 text-white'
                      : 'bg-slate-800/40 border-slate-700/50 text-slate-500'
                  }`}>
                  <span className={`w-2 h-2 rounded-full ${activeOverlays.includes(o.id) ? o.color : 'bg-slate-600'}`} />
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          {/* Goal Input */}
          <div>
            <label className="block text-xs text-slate-500 mb-2">Planning goal</label>
            <textarea
              value={goal}
              onChange={e => setGoal(e.target.value)}
              placeholder="e.g. Add housing near transit while reducing heat and improving biking"
              className="w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-lg px-3 py-2.5 resize-none placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-colors"
              rows={3}
            />
            <button onClick={handleAnalyze}
              disabled={!goal.trim() || analysisState === 'running'}
              className="mt-2 w-full py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-emerald-600 hover:bg-emerald-500 text-white">
              {analysisState === 'running' ? 'Analyzing…' : 'Analyze'}
            </button>
            {analysisError && (
              <div className="mt-2 text-xs text-rose-400 bg-rose-950/30 border border-rose-900/50 rounded-lg px-3 py-2">
                {analysisError}
              </div>
            )}
          </div>

          {/* Agent Pipeline */}
          {(analysisState === 'running' || analysisState === 'complete') && (
            <div className="bg-slate-800/50 border border-slate-700/60 rounded-lg px-4 py-3">
              <div className="text-xs text-slate-500 mb-2">Agent pipeline</div>
              {AGENTS.map(a => (
                <AgentRow key={a.id} label={a.label} status={agentStatuses[a.id]} />
              ))}
            </div>
          )}

          {/* Results */}
          {analysisState === 'complete' && (
            <>
              {/* Score Rings */}
              <div className="bg-slate-800/50 border border-slate-700/60 rounded-lg px-4 py-4">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-3">
                  <BarChart3 className="w-3.5 h-3.5" /> Current conditions
                </div>
                <div className="flex justify-around">
                  <ScoreRing label="Climate" score={data.currentConditions?.climateScore ?? 62}
                    icon={ThermometerSun} color="text-emerald-400" stroke="#10b981" />
                  <ScoreRing label="Access" score={data.currentConditions?.accessibilityScore ?? 71}
                    icon={Bike} color="text-sky-400" stroke="#38bdf8" />
                  <ScoreRing label="Housing" score={data.currentConditions?.housingScore ?? 48}
                    icon={Building2} color="text-amber-400" stroke="#f59e0b" />
                </div>
              </div>

              {/* Result Tabs */}
              <div>
                <div className="flex gap-1 mb-3">
                  {RESULT_TABS.map(t => (
                    <button key={t.id} onClick={() => setActiveTab(t.id)}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                        activeTab === t.id ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'
                      }`}>
                      {t.label}
                    </button>
                  ))}
                </div>

                {activeTab === 'recs' && (
                  <div>
                    {allRecs.slice(0, 5).map(r => <RecommendationCard key={r.id} rec={r} />)}
                    {data.agents?.urban_design?.summary && (
                      <div className="mt-3 p-3 bg-slate-800/40 rounded-lg border border-slate-700/40">
                        <div className="text-xs text-slate-500 mb-1">Urban Design synthesis</div>
                        <p className="text-xs text-slate-400 leading-relaxed">{data.agents.urban_design.summary}</p>
                      </div>
                    )}
                    {data.agents?.urban_design?.tradeoffs?.map((t, i) => (
                      <div key={i} className="mt-2 p-3 bg-amber-950/20 border border-amber-900/30 rounded-lg">
                        <div className="text-xs font-medium text-amber-400 mb-0.5">{t.issue}</div>
                        <div className="text-xs text-slate-400">{t.resolution}</div>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === 'risks' && (
                  <div>
                    {allRisks.map(r => <RiskItem key={r.id} risk={r} />)}
                    <div className="flex items-center gap-2 mt-3 text-xs text-slate-600">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Severity 1 (low) → 5 (critical)
                    </div>
                  </div>
                )}

                {activeTab === 'scenarios' && data.scenarios && (
                  <div>
                    <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
                      {SCENARIO_YEARS.map(year => (
                        <ScenarioCard
                          key={year}
                          year={year}
                          scenario={data.scenarios[year]}
                          image={visualizedImages[year] || data.scenarios[year]?.visualizationImage}
                          selected={selectedScenario === year}
                          onSelect={() => selectScenario(year)}
                        />
                      ))}
                    </div>
                    {data.scenarios[selectedScenario] && (
                      <>
                        <div className="rounded-xl bg-gradient-to-br from-emerald-950 via-slate-900 to-sky-950 border border-emerald-800/40 p-4 mb-3">
                          <div className="text-xs font-semibold text-emerald-400 tracking-wider mb-1">{selectedScenario} VISION</div>
                          <div className="text-sm font-bold text-white mb-2">{data.scenarios[selectedScenario].title}</div>
                          <p className="text-xs text-slate-300 leading-relaxed">{data.scenarios[selectedScenario].description}</p>
                        </div>
                        <div className="space-y-1.5 mb-3">
                          {data.scenarios[selectedScenario].projectedChanges?.map((c, i) => (
                            <div key={i} className="flex items-center gap-2 bg-slate-800/40 rounded-lg px-3 py-2">
                              <TrendingUp className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              <span className="text-xs text-slate-300">{c}</span>
                            </div>
                          ))}
                        </div>
                        {data.scenarios[selectedScenario].visualizationPrompt && (
                          <div className="bg-slate-800/50 border border-slate-700/60 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-medium text-slate-400">Midjourney prompt</span>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(data.scenarios[selectedScenario].visualizationPrompt);
                                  setCopied(true);
                                  setTimeout(() => setCopied(false), 2000);
                                }}
                                className="flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors">
                                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                {copied ? 'Copied!' : 'Copy'}
                              </button>
                            </div>
                            <p className="text-xs text-slate-500 leading-relaxed font-mono mb-2">
                              {data.scenarios[selectedScenario].visualizationPrompt}
                            </p>
                            {!data.scenarios[selectedScenario].visualizationImage && !visualizedImages[selectedScenario] && (
                              <>
                                <textarea
                                  value={userVisionText}
                                  onChange={e => setUserVisionText(e.target.value)}
                                  placeholder="Describe how you want this area to change (optional) — e.g. 'Turn this parking lot into a walkable mixed-use neighborhood'"
                                  rows={2}
                                  className="w-full bg-slate-800 border border-slate-700 text-white text-xs rounded-lg px-3 py-2 mb-2 resize-none placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-colors"
                                />
                                <div className="mb-2">
                                  <ReferenceImageInput referenceImage={referenceImage} onReferenceImageChange={setReferenceImage} />
                                </div>
                                <button
                                  onClick={() => handleGenerateVisualization(data.scenarios[selectedScenario].visualizationPrompt, selectedScenario)}
                                  disabled={visualizingYear === selectedScenario}
                                  className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium bg-emerald-700/80 hover:bg-emerald-700 text-white transition-colors disabled:opacity-50">
                                  {visualizingYear === selectedScenario ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                                  {visualizingYear === selectedScenario ? 'Generating…' : 'Generate with Midjourney'}
                                </button>
                              </>
                            )}
                            {visualizeError && (
                              <p className="text-xs text-rose-400 mt-2">{visualizeError}</p>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {activeTab === 'ask' && (
                  <div>
                    <div className="flex gap-2 mb-3">
                      <input
                        value={chatInput}
                        onChange={e => setChatInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleAsk(chatInput); }}
                        placeholder="Ask a question about this site…"
                        className="flex-1 bg-slate-800 border border-slate-700 text-white text-xs rounded-lg px-3 py-2 placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-colors"
                      />
                      <button
                        onClick={() => handleAsk(chatInput)}
                        disabled={!chatInput.trim() || chatLoading}
                        className="shrink-0 w-9 h-9 flex items-center justify-center rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white transition-colors">
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {chatMessages.length === 0 ? (
                      <div className="space-y-1.5">
                        <div className="text-xs text-slate-500 mb-1.5 flex items-center gap-1.5">
                          <MessageCircle className="w-3.5 h-3.5" /> Try asking:
                        </div>
                        {SUGGESTED_QUESTIONS.map(q => (
                          <button
                            key={q}
                            onClick={() => handleAsk(q)}
                            className="block w-full text-left text-xs bg-slate-800/40 hover:bg-slate-800 border border-slate-700/40 rounded-lg px-3 py-2 text-slate-300 transition-colors">
                            {q}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {chatMessages.map((m, i) => (
                          <div key={i} className={m.role === 'user' ? 'text-right' : ''}>
                            <div className={`inline-block max-w-[90%] text-xs rounded-lg px-3 py-2 leading-relaxed ${
                              m.role === 'user' ? 'bg-emerald-700 text-white' : 'bg-slate-800 text-slate-300'
                            }`}>
                              {m.text}
                            </div>
                          </div>
                        ))}
                        {chatLoading && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-500">
                            <Loader2 className="w-3 h-3 animate-spin" /> Thinking…
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="text-xs text-slate-700 pb-2">
                {data.dataDisclosure?.limitations?.[0]}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Map column */}
      <div className="flex-1 flex flex-col overflow-hidden">
      {/* Map */}
      <div className="flex-1 relative">
        <MapContainer center={[selectedLocation.latitude, selectedLocation.longitude]} zoom={15}
          style={{ height: '100%', width: '100%' }} className="z-0">
          <RecenterMap center={[selectedLocation.latitude, selectedLocation.longitude]} zoom={15} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png"
          />
          <MapOverlays activeOverlays={isBerkeleyLocation(selectedLocation) ? activeOverlays : []} mapScenario={activeTime} />
          <InterventionLayer visible={analysisState === 'complete' && isBerkeleyLocation(selectedLocation)} />
          <Marker position={[selectedLocation.latitude, selectedLocation.longitude]}>
            <Popup>
              <div style={{ fontFamily: 'system-ui' }}>
                <div style={{ fontWeight: 700, marginBottom: 3 }}>{selectedLocation.displayName || selectedLocation.formattedAddress}</div>
                <div style={{ fontSize: 12, color: '#94a3b8' }}>Active analysis site</div>
              </div>
            </Popup>
          </Marker>
        </MapContainer>

        {/* Future scenario visualization overlay */}
        {activeTime === '2040' && selectedScenario !== '2026' && (visualizedImages[selectedScenario] || data?.scenarios?.[selectedScenario]?.visualizationImage) && (
          <div className="absolute inset-0 z-[400]">
            <img
              src={visualizedImages[selectedScenario] || data.scenarios[selectedScenario].visualizationImage}
              alt={`${selectedScenario} visualization`}
              className="w-full h-full object-cover"
            />
            <div className="absolute top-4 left-4 bg-slate-900/90 border border-emerald-700/50 rounded-lg px-3 py-1.5 backdrop-blur-sm">
              <span className="text-xs font-semibold text-emerald-400 tracking-wider">{selectedScenario} VISION</span>
            </div>
          </div>
        )}

        {/* Timeline toggle */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] flex bg-slate-900/90 border border-slate-700 rounded-full p-0.5 backdrop-blur-sm">
          {['today', '2040'].map(t => (
            <button key={t} onClick={() => setActiveTime(t)}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                activeTime === t ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
              }`}>
              {t === 'today' ? 'Today' : (selectedScenario !== '2026' ? selectedScenario : '2040')}
            </button>
          ))}
        </div>

        {/* Map legend */}
        <div className="absolute bottom-4 right-4 z-[1000] bg-slate-900/90 border border-slate-700 rounded-xl px-3 py-3 backdrop-blur-sm space-y-1.5">
          <div className="text-xs font-medium text-slate-400 mb-2">Legend</div>
          {activeOverlays.includes('heat') && (
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 opacity-80" /> Heat island
            </div>
          )}
          {activeOverlays.includes('green') && (
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 opacity-80" /> Tree canopy
            </div>
          )}
          {activeOverlays.includes('traffic') && (
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-500 opacity-80" /> Transit access
            </div>
          )}
          {analysisState === 'complete' && (
            <>
              <div className="border-t border-slate-800 my-1" />
              <div className="text-xs font-medium text-slate-400 mb-1">Interventions</div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Housing
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" /> Climate
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-400" /> Bike corridor
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="w-2.5 h-2.5 rounded-full bg-violet-400" /> ADA
              </div>
            </>
          )}
          {activeTime === '2040' && (
            <div className="border-t border-slate-800 pt-1.5 mt-1">
              <span className="text-xs text-emerald-400 font-semibold">{selectedScenario !== '2026' ? selectedScenario : '2040'} scenario</span>
            </div>
          )}
        </div>
      </div>

      {/* Recommended interventions strip */}
      {analysisState === 'complete' && allRecs.length > 0 && (
        <div className="shrink-0 border-t border-slate-800 bg-slate-900 px-5 py-3">
          <div className="text-xs font-medium text-slate-500 mb-2">Recommended Interventions</div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {allRecs.slice(0, 6).map(r => <InterventionCard key={r.id} rec={r} />)}
          </div>
        </div>
      )}
      </div>
      </div>
    </div>
  );
}
