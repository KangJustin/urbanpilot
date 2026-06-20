import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline } from 'react-leaflet';
import L from 'leaflet';
import {
  MapPin, Layers, ThermometerSun, Bike, Building2,
  CheckCircle2, Loader2, Clock, AlertTriangle,
  Sparkles, BarChart3, TreePine, TrendingUp,
} from 'lucide-react';
import berkeleyData from './mock/berkeleyAnalysis.json';
import { analyzeNeighborhood } from './services/analysisApi';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const DOWNTOWN_BERKELEY = [37.8703, -122.2677];

const AGENTS = [
  { id: 'coordinator', label: 'Coordinator' },
  { id: 'climate', label: 'Climate Agent' },
  { id: 'accessibility', label: 'Accessibility Agent' },
  { id: 'housing', label: 'Housing Agent' },
  { id: 'urban_design', label: 'Urban Design Agent' },
];

const COST_COLORS = { low: 'text-emerald-400', medium: 'text-amber-400', high: 'text-rose-400' };
const SEVERITY_COLORS = [null, 'bg-emerald-500', 'bg-emerald-400', 'bg-amber-400', 'bg-rose-400', 'bg-rose-600'];

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
    dot: '#f59e0b', ring: '#78350f',
  },
  {
    id: 'housing-center',
    pos: [37.8710, -122.2668],
    label: 'Mixed-Use Infill',
    sub: 'Center St & Shattuck',
    dot: '#f59e0b', ring: '#78350f',
  },
  {
    id: 'trees-telegraph',
    pos: [37.8651, -122.2591],
    label: 'Street Tree Planting',
    sub: 'Telegraph Ave corridor',
    dot: '#4ade80', ring: '#14532d',
  },
  {
    id: 'bioswale',
    pos: [37.8713, -122.2696],
    label: 'Green Infrastructure',
    sub: 'Civic Center bioswale + permeable paving',
    dot: '#4ade80', ring: '#14532d',
  },
  {
    id: 'ada',
    pos: [37.8697, -122.2681],
    label: 'ADA Crossing Upgrades',
    sub: '12 priority intersections',
    dot: '#a78bfa', ring: '#2e1065',
  },
];

const BIKE_CORRIDOR = [
  [37.8695, -122.2730],
  [37.8695, -122.2710],
  [37.8695, -122.2688],
  [37.8695, -122.2660],
  [37.8695, -122.2640],
];

function makeInterventionIcon(dot, ring) {
  return L.divIcon({
    html: `<div style="width:26px;height:26px;border-radius:50%;background:${ring};border:2px solid ${dot};display:flex;align-items:center;justify-content:center;box-shadow:0 0 10px ${dot}55">
      <div style="width:8px;height:8px;background:${dot};border-radius:50%"></div>
    </div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
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
        <Marker key={s.id} position={s.pos} icon={makeInterventionIcon(s.dot, s.ring)}>
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

export default function App() {
  const [goal, setGoal] = useState('');
  const [analysisState, setAnalysisState] = useState('idle');
  const [agentStatuses, setAgentStatuses] = useState({});
  const [activeTab, setActiveTab] = useState('recs');
  const [activeTime, setActiveTime] = useState('today');
  const [activeOverlays, setActiveOverlays] = useState(['heat', 'green']);
  const [results, setResults] = useState(null);

  const data = results || berkeleyData;
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

    const [apiResult] = await Promise.all([
      analyzeNeighborhood({
        analysisId: `demo-${Date.now()}`,
        site: { name: 'Downtown Berkeley, CA', center: { latitude: 37.8703, longitude: -122.2677 }, city: 'Berkeley', state: 'California' },
        goal: { primary: 'mixed_use_development', description: goal, priorities: [] },
        scenarioYears: [2025, 2040],
      }).catch(() => null),
      new Promise(resolve => setTimeout(resolve, 3700)),
    ]);

    setAgentStatuses(prev => ({ ...prev, urban_design: 'done' }));
    if (apiResult) setResults(apiResult);
    setAnalysisState('complete');
    setActiveTab('recs');
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
    { id: '2040', label: '2040' },
  ];

  return (
    <div className="h-screen flex overflow-hidden bg-slate-950">
      {/* Sidebar */}
      <div className="w-[380px] bg-slate-900 border-r border-slate-800 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-5 h-5 text-emerald-400" />
            <h1 className="text-lg font-bold text-white tracking-tight">UrbanPilot</h1>
          </div>
          <p className="text-xs text-slate-500">Multi-agent urban planning copilot</p>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Site */}
          <div className="flex items-center gap-2 bg-slate-800/60 rounded-lg px-3 py-2.5">
            <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-sm font-medium text-white">Downtown Berkeley, CA</span>
          </div>

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

                {activeTab === '2040' && data.scenarios?.['2040'] && (
                  <div>
                    <div className="rounded-xl bg-gradient-to-br from-emerald-950 via-slate-900 to-sky-950 border border-emerald-800/40 p-4 mb-3">
                      <div className="text-xs font-semibold text-emerald-400 tracking-wider mb-1">2040 VISION</div>
                      <div className="text-sm font-bold text-white mb-2">{data.scenarios['2040'].title}</div>
                      <p className="text-xs text-slate-300 leading-relaxed">{data.scenarios['2040'].description}</p>
                    </div>
                    <div className="space-y-1.5">
                      {data.scenarios['2040'].projectedChanges?.map((c, i) => (
                        <div key={i} className="flex items-center gap-2 bg-slate-800/40 rounded-lg px-3 py-2">
                          <TrendingUp className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span className="text-xs text-slate-300">{c}</span>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => setActiveTime(t => t === 'today' ? '2040' : 'today')}
                      className="mt-3 w-full py-2 rounded-lg text-xs font-medium border border-emerald-700 text-emerald-400 hover:bg-emerald-900/30 transition-colors">
                      {activeTime === 'today' ? '→ Show 2040 on map' : '← Back to today'}
                    </button>
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

      {/* Map */}
      <div className="flex-1 relative">
        <MapContainer center={DOWNTOWN_BERKELEY} zoom={15}
          style={{ height: '100%', width: '100%' }} className="z-0">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png"
          />
          <MapOverlays activeOverlays={activeOverlays} mapScenario={activeTime} />
          <InterventionLayer visible={analysisState === 'complete'} />
          <Marker position={DOWNTOWN_BERKELEY}>
            <Popup>
              <div style={{ fontFamily: 'system-ui' }}>
                <div style={{ fontWeight: 700, marginBottom: 3 }}>Downtown Berkeley, CA</div>
                <div style={{ fontSize: 12, color: '#94a3b8' }}>Active analysis site</div>
              </div>
            </Popup>
          </Marker>
        </MapContainer>

        {/* Timeline toggle */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] flex bg-slate-900/90 border border-slate-700 rounded-full p-0.5 backdrop-blur-sm">
          {['today', '2040'].map(t => (
            <button key={t} onClick={() => setActiveTime(t)}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                activeTime === t ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
              }`}>
              {t === 'today' ? 'Today' : '2040'}
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
              <span className="text-xs text-emerald-400 font-semibold">2040 scenario</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
