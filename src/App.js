import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import {
  MapPin, Layers, ThermometerSun, Bike, Building2,
  CheckCircle2, Loader2, Clock, ChevronRight, AlertTriangle,
  Sparkles, BarChart3
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

function MapOverlays({ activeOverlays, mapScenario, mapCenter }) {
  const [lat, lng] = mapCenter;
  const o = 0.005;

  const scenarios = {
    today: {
      heat: [
        { center: [lat, lng], radius: 300, color: 'red', opacity: 0.24 },
        { center: [lat + o, lng - o], radius: 200, color: 'orange', opacity: 0.18 },
        { center: [lat - o * 0.5, lng + o * 0.5], radius: 150, color: '#f59e0b', opacity: 0.14 },
      ],
      green: [
        { center: [lat + o * 0.4, lng + o * 0.4], radius: 180, color: '#22c55e', opacity: 0.35 },
        { center: [lat - o * 0.8, lng - o * 0.2], radius: 110, color: '#4ade80', opacity: 0.3 },
      ],
      traffic: [
        { center: [lat - o * 0.1, lng - o * 0.2], radius: 220, color: '#38bdf8', opacity: 0.15 },
        { center: [lat + o * 0.6, lng + o * 0.2], radius: 140, color: '#7dd3fc', opacity: 0.12 },
      ],
    },
    '2040': {
      heat: [
        { center: [lat, lng], radius: 180, color: 'orange', opacity: 0.12 },
        { center: [lat + o, lng - o], radius: 120, color: '#f59e0b', opacity: 0.08 },
      ],
      green: [
        { center: [lat + o * 0.4, lng + o * 0.4], radius: 260, color: '#22c55e', opacity: 0.4 },
        { center: [lat - o * 0.8, lng - o * 0.2], radius: 200, color: '#4ade80', opacity: 0.35 },
        { center: [lat + o * 0.7, lng + o * 0.6], radius: 150, color: '#86efac', opacity: 0.3 },
        { center: [lat - o * 0.3, lng + o * 0.8], radius: 130, color: '#4ade80', opacity: 0.28 },
      ],
      traffic: [
        { center: [lat - o * 0.1, lng - o * 0.2], radius: 240, color: '#38bdf8', opacity: 0.2 },
        { center: [lat + o * 0.6, lng + o * 0.2], radius: 180, color: '#7dd3fc', opacity: 0.17 },
        { center: [lat - o * 0.5, lng + o * 0.5], radius: 120, color: '#bae6fd', opacity: 0.14 },
      ],
    },
  };

  const data = scenarios[mapScenario] || scenarios.today;

  return (
    <>
      {activeOverlays.includes('heat') && data.heat.map((z, i) => (
        <Circle key={`h${i}`} center={z.center} radius={z.radius}
          pathOptions={{ color: z.color, fillColor: z.color, fillOpacity: z.opacity, weight: 1, opacity: z.opacity * 2 }} />
      ))}
      {activeOverlays.includes('green') && data.green.map((z, i) => (
        <Circle key={`g${i}`} center={z.center} radius={z.radius}
          pathOptions={{ color: z.color, fillColor: z.color, fillOpacity: z.opacity, weight: 1, opacity: z.opacity + 0.2 }} />
      ))}
      {activeOverlays.includes('traffic') && data.traffic.map((z, i) => (
        <Circle key={`t${i}`} center={z.center} radius={z.radius}
          pathOptions={{ color: z.color, fillColor: z.color, fillOpacity: z.opacity, weight: 1, opacity: z.opacity + 0.1 }} />
      ))}
    </>
  );
}

function ScoreBar({ label, score, icon: Icon, color }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <Icon className="w-3.5 h-3.5" />
          {label}
        </div>
        <span className={`text-sm font-bold ${color}`}>{score}</span>
      </div>
      <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${color.replace('text-', 'bg-')}`}
          style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

function AgentRow({ label, status }) {
  return (
    <div className="flex items-center gap-2.5 py-1.5">
      {status === 'done' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
      {status === 'running' && <Loader2 className="w-4 h-4 text-sky-400 animate-spin shrink-0" />}
      {status === 'queued' && <Clock className="w-4 h-4 text-slate-500 shrink-0" />}
      {!status && <Clock className="w-4 h-4 text-slate-600 shrink-0" />}
      <span className={`text-sm ${status === 'running' ? 'text-sky-300' : status === 'done' ? 'text-white' : 'text-slate-500'}`}>
        {label}
      </span>
      {status === 'running' && <span className="text-xs text-sky-400 ml-auto">Analyzing…</span>}
      {status === 'done' && <span className="text-xs text-emerald-500 ml-auto">Done</span>}
    </div>
  );
}

function RiskItem({ risk }) {
  return (
    <div className="flex gap-3 py-2 border-b border-slate-800 last:border-0">
      <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${SEVERITY_COLORS[risk.severity] || 'bg-slate-500'}`} />
      <div>
        <div className="text-sm font-medium text-white">{risk.title}</div>
        <div className="text-xs text-slate-400 mt-0.5">{risk.description}</div>
      </div>
    </div>
  );
}

function RecommendationItem({ rec }) {
  return (
    <div className="py-2.5 border-b border-slate-800 last:border-0">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          <ChevronRight className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
          <div>
            <div className="text-sm font-medium text-white">{rec.title}</div>
            <div className="text-xs text-slate-400 mt-0.5">{rec.description}</div>
          </div>
        </div>
        <span className={`text-xs shrink-0 mt-0.5 ${COST_COLORS[rec.cost] || 'text-slate-400'}`}>
          {rec.cost}
        </span>
      </div>
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
    ...data.agents.climate.risks,
    ...data.agents.accessibility.risks,
    ...data.agents.housing.risks,
  ];
  const allRecs = [
    ...data.agents.climate.recommendations,
    ...data.agents.accessibility.recommendations,
    ...data.agents.housing.recommendations,
  ];

  const handleAnalyze = () => {
    if (!goal.trim()) return;
    setAnalysisState('running');
    setResults(null);
    setActiveTab('agents');

    analyzeNeighborhood({
      analysisId: `demo-${Date.now()}`,
      site: {
        name: 'Downtown Berkeley, CA',
        center: { latitude: 37.8703, longitude: -122.2677 },
        city: 'Berkeley',
        state: 'California',
      },
      goal: { primary: 'mixed_use_development', description: goal, priorities: [] },
      scenarioYears: [2025, 2040],
    })
      .then(res => setResults(res))
      .catch(() => {}); // silently fall back to berkeleyData

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
      [3450, 'urban_design', 'done'],
    ];

    steps.forEach(([ms, agent, status]) => {
      setTimeout(() => setAgentStatuses(prev => ({ ...prev, [agent]: status })), ms);
    });

    setTimeout(() => {
      setAnalysisState('complete');
      setActiveTab('recs');
    }, 3700);
  };

  const toggleOverlay = (id) => {
    setActiveOverlays(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const OVERLAY_OPTIONS = [
    { id: 'heat', label: 'Heat', color: 'bg-rose-500' },
    { id: 'green', label: 'Canopy', color: 'bg-emerald-500' },
    { id: 'traffic', label: 'Transit', color: 'bg-sky-500' },
  ];

  const RESULT_TABS = [
    { id: 'recs', label: 'Recommendations' },
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

          {/* Map Overlays */}
          <div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-2">
              <Layers className="w-3.5 h-3.5" />
              Overlays
            </div>
            <div className="flex gap-2">
              {OVERLAY_OPTIONS.map(o => (
                <button
                  key={o.id}
                  onClick={() => toggleOverlay(o.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                    activeOverlays.includes(o.id)
                      ? 'bg-slate-700 border-slate-600 text-white'
                      : 'bg-slate-800/40 border-slate-700/50 text-slate-500'
                  }`}
                >
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
              placeholder="e.g. Add housing near transit while reducing heat exposure and improving biking"
              className="w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-lg px-3 py-2.5 resize-none placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-colors"
              rows={3}
            />
            <button
              onClick={handleAnalyze}
              disabled={!goal.trim() || analysisState === 'running'}
              className="mt-2 w-full py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-emerald-600 hover:bg-emerald-500 text-white"
            >
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
              {/* Scores */}
              <div className="bg-slate-800/50 border border-slate-700/60 rounded-lg px-4 py-3 space-y-3">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                  <BarChart3 className="w-3.5 h-3.5" />
                  Current scores
                </div>
                <ScoreBar label="Climate" score={data.currentConditions.climateScore} icon={ThermometerSun} color="text-emerald-400" />
                <ScoreBar label="Accessibility" score={data.currentConditions.accessibilityScore} icon={Bike} color="text-sky-400" />
                <ScoreBar label="Housing" score={data.currentConditions.housingScore} icon={Building2} color="text-amber-400" />
              </div>

              {/* Result Tabs */}
              <div>
                <div className="flex gap-1 mb-3">
                  {RESULT_TABS.map(t => (
                    <button
                      key={t.id}
                      onClick={() => setActiveTab(t.id)}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                        activeTab === t.id
                          ? 'bg-slate-700 text-white'
                          : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                {activeTab === 'recs' && (
                  <div>
                    {allRecs.slice(0, 5).map(r => <RecommendationItem key={r.id} rec={r} />)}
                    <div className="mt-3 text-xs text-slate-600 italic">
                      Urban Design synthesis: {data.agents.urban_design.summary}
                    </div>
                  </div>
                )}

                {activeTab === 'risks' && (
                  <div>
                    {allRisks.map(r => <RiskItem key={r.id} risk={r} />)}
                    <div className="flex items-center gap-2 mt-3 text-xs text-slate-600">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Severity: low / medium / high / critical
                    </div>
                  </div>
                )}

                {activeTab === '2040' && (
                  <div>
                    <div className="text-sm font-semibold text-emerald-400 mb-2">
                      {data.scenarios['2040'].title}
                    </div>
                    <p className="text-sm text-slate-300 leading-relaxed mb-3">
                      {data.scenarios['2040'].description}
                    </p>
                    <div className="space-y-1">
                      {data.scenarios['2040'].projectedChanges.map((c, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs text-slate-400">
                          <ChevronRight className="w-3 h-3 text-emerald-500 shrink-0" />
                          {c}
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => setActiveTime(t => t === 'today' ? '2040' : 'today')}
                      className="mt-4 w-full py-2 rounded-lg text-xs font-medium border border-emerald-700 text-emerald-400 hover:bg-emerald-900/30 transition-colors"
                    >
                      {activeTime === 'today' ? 'Show 2040 on map' : 'Show Today on map'}
                    </button>
                  </div>
                )}
              </div>

              {/* Tradeoffs */}
              {activeTab === 'recs' && (
                <div className="bg-slate-800/40 border border-slate-700/40 rounded-lg px-4 py-3">
                  <div className="text-xs text-slate-500 mb-2">Tradeoff resolutions</div>
                  {data.agents.urban_design.tradeoffs.map((t, i) => (
                    <div key={i} className="mb-3 last:mb-0">
                      <div className="text-xs font-medium text-amber-400">{t.issue}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{t.resolution}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Data disclosure */}
              <div className="text-xs text-slate-700 pb-2">
                {data.dataDisclosure.limitations[0]}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        <MapContainer
          center={DOWNTOWN_BERKELEY}
          zoom={15}
          style={{ height: '100%', width: '100%' }}
          className="z-0"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png"
          />
          <MapOverlays
            activeOverlays={activeOverlays}
            mapScenario={activeTime}
            mapCenter={DOWNTOWN_BERKELEY}
          />
          <Marker position={DOWNTOWN_BERKELEY}>
            <Popup>
              <div className="text-sm font-semibold">Downtown Berkeley, CA</div>
              <div className="text-xs text-gray-600 mt-1">Active analysis site</div>
            </Popup>
          </Marker>
        </MapContainer>

        {/* Timeline toggle */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] flex bg-slate-900/90 border border-slate-700 rounded-full p-0.5 backdrop-blur-sm">
          {['today', '2040'].map(t => (
            <button
              key={t}
              onClick={() => setActiveTime(t)}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                activeTime === t
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {t === 'today' ? 'Today' : '2040'}
            </button>
          ))}
        </div>

        {/* Map legend */}
        <div className="absolute bottom-4 right-4 z-[1000] bg-slate-900/90 border border-slate-700 rounded-lg px-3 py-2.5 backdrop-blur-sm">
          <div className="text-xs text-slate-500 mb-1.5">Overlays</div>
          <div className="space-y-1">
            {activeOverlays.includes('heat') && (
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 opacity-70" /> Heat island
              </div>
            )}
            {activeOverlays.includes('green') && (
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 opacity-70" /> Tree canopy
              </div>
            )}
            {activeOverlays.includes('traffic') && (
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-500 opacity-70" /> Transit access
              </div>
            )}
          </div>
          {activeTime === '2040' && (
            <div className="mt-2 text-xs text-emerald-500 font-medium">2040 scenario</div>
          )}
        </div>
      </div>
    </div>
  );
}
