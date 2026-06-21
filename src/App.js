import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import {
  ThermometerSun, Bike, Building2,
  Loader2, Sparkles, BarChart3, TrendingUp, Copy, Check,
  Send, MessageCircle, Camera,
} from 'lucide-react';
import berkeleyData from './mock/berkeleyAnalysis.json';
import {
  analyzeNeighborhood, generateVisualization, getConditions, askQuestion,
  getStreetViewStatus, streetViewImageUrl, satelliteImageUrl,
} from './services/analysisApi';
import {
  DEFAULT_LOCATION, AGENTS, RESULT_TABS, SCENARIO_YEARS, SUGGESTED_QUESTIONS,
} from './constants/planning';
import {
  weatherIcon, aqiCategory, getHeatRisk, getFloodRisk, isBerkeleyLocation,
} from './utils/planningHelpers';
import AppShell from './components/layout/AppShell';
import TopHeader from './components/layout/TopHeader';
import LocationSearch from './components/LocationSearch';
import PresentDayView from './components/PresentDayView';
import ReferenceImageInput from './components/ReferenceImageInput';
import ScoreRing from './components/shared/ScoreRing';
import AgentPipeline from './components/analysis/AgentPipeline';
import RecommendationCard from './components/insights/RecommendationCard';
import RisksPanel from './components/insights/RisksPanel';
import ScenarioCard from './components/scenarios/ScenarioCard';
import InterventionsStrip from './components/interventions/InterventionsStrip';
import RecenterMap from './components/map/RecenterMap';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export default function App() {
  const [goal, setGoal] = useState('');
  const [analysisState, setAnalysisState] = useState('idle');
  const [agentStatuses, setAgentStatuses] = useState({});
  const [activeTab, setActiveTab] = useState('recs');
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
  const [presentPhotoUrl, setPresentPhotoUrl] = useState(null);
  const [presentPhotoSource, setPresentPhotoSource] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getConditions(selectedLocation.latitude, selectedLocation.longitude)
      .then(c => { if (!cancelled) setConditions(c); })
      .catch(() => { if (!cancelled) setConditions(null); });
    return () => { cancelled = true; };
  }, [selectedLocation]);

  useEffect(() => {
    let cancelled = false;
    const { latitude, longitude } = selectedLocation;
    getStreetViewStatus(latitude, longitude)
      .then(({ available }) => {
        if (cancelled) return;
        setPresentPhotoUrl(available ? streetViewImageUrl(latitude, longitude) : satelliteImageUrl(latitude, longitude));
        setPresentPhotoSource(available ? 'google-street-view' : 'google-satellite');
      })
      .catch(() => {
        if (cancelled) return;
        setPresentPhotoUrl(satelliteImageUrl(latitude, longitude));
        setPresentPhotoSource('google-satellite');
      });
    return () => { cancelled = true; };
  }, [selectedLocation]);

  function handleLocationSelected(location) {
    setSelectedLocation(location);
    setResults(null);
    setAnalysisState('idle');
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
    const effectiveReferenceImage = referenceImage || (presentPhotoUrl
      ? { imageUrl: presentPhotoUrl, source: presentPhotoSource, licenseConfirmed: true }
      : null);
    try {
      const { imageUrl } = await generateVisualization(prompt, effectiveReferenceImage);
      setVisualizedImages(prev => ({ ...prev, [year]: imageUrl }));
      setSelectedScenario(year);
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
  }

  const hasRealData = !!results || !selectedLocation.placeId;
  const baseData = hasRealData ? (results || berkeleyData) : { agents: {}, scenarios: {}, dataDisclosure: {} };
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
      setAnalysisError('Analysis failed for this location. Please try again.');
      setAnalysisState('idle');
    } else {
      setAnalysisError(null);
      setAnalysisState('complete');
      setActiveTab('recs');
    }
  };

  const sidebar = (
    <aside className="w-[380px] bg-up-charcoal border-r border-up-border flex flex-col overflow-hidden shrink-0">
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        <LocationSearch onLocationSelected={handleLocationSelected} />
        <PresentDayView location={selectedLocation} />

        <div>
          <label className="up-label block mb-2">Planning goal</label>
          <textarea
            value={goal}
            onChange={e => setGoal(e.target.value)}
            placeholder="e.g. Add housing near transit while reducing heat and improving biking"
            className="up-input w-full text-sm px-3 py-2.5 resize-none"
            rows={3}
          />
          <button
            type="button"
            onClick={handleAnalyze}
            disabled={!goal.trim() || analysisState === 'running'}
            className="up-btn-primary mt-2 w-full"
          >
            {analysisState === 'running' ? 'Analyzing…' : 'Analyze'}
          </button>
          {analysisError && (
            <div className="mt-2 text-xs text-rose-400 bg-rose-950/30 border border-rose-900/50 rounded-lg px-3 py-2">
              {analysisError}
            </div>
          )}
        </div>

        {(analysisState === 'running' || analysisState === 'complete') && (
          <AgentPipeline agents={AGENTS} agentStatuses={agentStatuses} />
        )}

        {analysisState === 'complete' && (
          <>
            <div className="up-panel px-4 py-4">
              <div className="flex items-center gap-1.5 up-label mb-3">
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

            <div>
              <div className="flex gap-1 mb-3">
                {RESULT_TABS.map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setActiveTab(t.id)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      activeTab === t.id ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {activeTab === 'recs' && (
                <div>
                  {allRecs.slice(0, 5).map(r => <RecommendationCard key={r.id} rec={r} />)}
                  {data.agents?.urban_design?.summary && (
                    <div className="mt-3 p-3 bg-slate-800/40 rounded-lg border border-slate-700/40">
                      <div className="up-label mb-1">Urban Design synthesis</div>
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

              {activeTab === 'risks' && <RisksPanel risks={allRisks} />}

              {activeTab === 'scenarios' && data.scenarios && (
                <div>
                  <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
                    {SCENARIO_YEARS.map(year => (
                      <ScenarioCard
                        key={year}
                        year={year}
                        scenario={data.scenarios[year]}
                        image={year === '2026' ? presentPhotoUrl : (visualizedImages[year] || data.scenarios[year]?.visualizationImage)}
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
                      {selectedScenario === '2026' ? (
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-800/40 border border-slate-700/40 rounded-lg px-3 py-2">
                          <Camera className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          This is a live Street View / satellite photo of the site today — see the Present-Day View panel.
                        </div>
                      ) : data.scenarios[selectedScenario].visualizationPrompt && (
                        <div className="up-panel p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium text-slate-400">Midjourney prompt</span>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(data.scenarios[selectedScenario].visualizationPrompt);
                                setCopied(true);
                                setTimeout(() => setCopied(false), 2000);
                              }}
                              className="flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
                            >
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
                                className="up-input w-full text-xs px-3 py-2 mb-2 resize-none"
                              />
                              <div className="mb-2">
                                <ReferenceImageInput referenceImage={referenceImage} onReferenceImageChange={setReferenceImage} autoPhotoUrl={presentPhotoUrl} />
                              </div>
                              <button
                                type="button"
                                onClick={() => handleGenerateVisualization(data.scenarios[selectedScenario].visualizationPrompt, selectedScenario)}
                                disabled={visualizingYear === selectedScenario}
                                className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium bg-emerald-700/80 hover:bg-emerald-700 text-white transition-colors disabled:opacity-50"
                              >
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
                      className="up-input flex-1 text-xs px-3 py-2"
                    />
                    <button
                      type="button"
                      onClick={() => handleAsk(chatInput)}
                      disabled={!chatInput.trim() || chatLoading}
                      className="shrink-0 w-9 h-9 flex items-center justify-center rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white transition-colors"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {chatMessages.length === 0 ? (
                    <div className="space-y-1.5">
                      <div className="up-label mb-1.5 flex items-center gap-1.5">
                        <MessageCircle className="w-3.5 h-3.5" /> Try asking:
                      </div>
                      {SUGGESTED_QUESTIONS.map(q => (
                        <button
                          key={q}
                          type="button"
                          onClick={() => handleAsk(q)}
                          className="block w-full text-left text-xs bg-slate-800/40 hover:bg-slate-800 border border-slate-700/40 rounded-lg px-3 py-2 text-slate-300 transition-colors"
                        >
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
                          }`}
                          >
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
    </aside>
  );

  const mapColumn = (
    <div className="flex-1 flex flex-col overflow-hidden min-w-0">
      <div className="flex-1 relative min-h-0">
        <MapContainer
          center={[selectedLocation.latitude, selectedLocation.longitude]}
          zoom={15}
          style={{ height: '100%', width: '100%' }}
          className="z-0"
        >
          <RecenterMap center={[selectedLocation.latitude, selectedLocation.longitude]} zoom={15} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png"
          />
          <Marker position={[selectedLocation.latitude, selectedLocation.longitude]}>
            <Popup>
              <div style={{ fontFamily: 'system-ui' }}>
                <div style={{ fontWeight: 700, marginBottom: 3 }}>{selectedLocation.displayName || selectedLocation.formattedAddress}</div>
                <div style={{ fontSize: 12, color: '#94a3b8' }}>Active analysis site</div>
              </div>
            </Popup>
          </Marker>
        </MapContainer>

        {analysisState === 'complete' && selectedScenario && (() => {
          const overlaySrc = selectedScenario === '2026'
            ? presentPhotoUrl
            : (visualizedImages[selectedScenario] || data?.scenarios?.[selectedScenario]?.visualizationImage);
          if (!overlaySrc) return null;
          return (
            <div className="absolute inset-0 z-[400]">
              <img src={overlaySrc} alt={`${selectedScenario} view`} className="w-full h-full object-cover" />
              <div className="absolute top-4 left-4 bg-slate-900/90 border border-emerald-700/50 rounded-lg px-3 py-1.5 backdrop-blur-sm flex items-center gap-1.5">
                {selectedScenario === '2026' && <Camera className="w-3.5 h-3.5 text-emerald-400" />}
                <span className="text-xs font-semibold text-emerald-400 tracking-wider">
                  {selectedScenario === '2026' ? 'TODAY — LIVE PHOTO' : `${selectedScenario} VISION`}
                </span>
              </div>
            </div>
          );
        })()}
      </div>

      {analysisState === 'complete' && allRecs.length > 0 && (
        <InterventionsStrip recommendations={allRecs} />
      )}
    </div>
  );

  return (
    <AppShell
      header={(
        <TopHeader
          site={data.site}
          conditions={conditions}
          aqiInfo={aqiInfo}
          heatRisk={heatRisk}
          floodRisk={floodRisk}
          WeatherIcon={WeatherIcon}
        />
      )}
      sidebar={sidebar}
    >
      {mapColumn}
    </AppShell>
  );
}
