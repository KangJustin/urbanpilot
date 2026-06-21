import React, { useState, useEffect } from 'react';
import {
  ThermometerSun, Bike, Building2, Compass,
  CheckCircle2, Loader2, Clock,
  BarChart3, Sparkles,
  Sun, Cloud, CloudRain, CloudSnow, CloudLightning, CloudFog,
} from 'lucide-react';
import {
  analyzeNeighborhood, generateVisualization, getConditions, askQuestion,
  getStreetViewStatus, streetViewImageUrl, satelliteImageUrl,
} from './services/analysisApi';
import PresentDayView from './components/PresentDayView';
import TopHeader from './components/TopHeader';
import ControlStrip from './components/ControlStrip';
import AgentCard from './components/AgentCard';
import ScoreBreakdownPanel from './components/ScoreBreakdownPanel';
import CurrentConditionsPanel from './components/CurrentConditionsPanel';
import RisksPanel from './components/RisksPanel';
import RecommendationsPanel from './components/RecommendationsPanel';
import MainMapPanel from './components/MainMapPanel';
import InterventionsPanel from './components/InterventionsPanel';
import AIAssistantPanel from './components/AIAssistantPanel';

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

const GOAL_CHIPS = [
  'Add housing near transit',
  'Reduce urban heat island effect',
  'Improve bike & pedestrian safety',
  'Increase tree canopy coverage',
  'Add affordable housing',
  'Improve flood resilience',
];


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

export default function App() {
  const [goal, setGoal] = useState('');
  const [analysisState, setAnalysisState] = useState('idle');
  const [agentStatuses, setAgentStatuses] = useState({});
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

  // The real "now" photo for the site — Street View if covered, satellite otherwise. Used to
  // display the 2026 scenario, and (per explicit product decision, accepting the associated
  // Google Maps Platform ToS risk) as the default Midjourney reference image for 2040/2075
  // when the user hasn't uploaded their own photo.
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
    // A new location invalidates any analysis/scenario/chat state from the previous place.
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
    // Default to the real captured photo as the Midjourney reference unless the user uploaded
    // their own — accepted product decision, not a per-image user consent checkbox.
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

  // No bundled demo content — every section (scores, scenarios, the map's 2040/2075 image
  // overlay) stays empty until a real analysis actually completes. Site identity always follows
  // the single source of truth (selectedLocation), whether or not an analysis has run for it yet.
  const baseData = results || { agents: {}, scenarios: {}, dataDisclosure: {} };
  const data = {
    ...baseData,
    site: { name: selectedLocation.displayName || selectedLocation.formattedAddress, center: { latitude: selectedLocation.latitude, longitude: selectedLocation.longitude } },
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
      console.error('Analysis request failed:', err.message);
    }

    setAgentStatuses(prev => ({ ...prev, urban_design: 'done' }));

    if (apiResult) {
      setResults(apiResult);
      setAnalysisError(null);
      setAnalysisState('complete');
    } else {
      setAnalysisError('Analysis failed for this location. Please try again.');
      setAnalysisState('idle');
    }
  };

  const SCENARIO_YEARS = ['2026', '2040', '2075'];

  const climateAgent = data.agents?.climate;
  const accessibilityAgent = data.agents?.accessibility;
  const housingAgent = data.agents?.housing;
  const urbanDesignAgent = data.agents?.urban_design;

  // The vision agent independently estimates a "2026" scenario score for narrative purposes
  // (title/description/visualizationPrompt), but that's a second, separately AI-generated number
  // for the same point in time the specialist agents already scored — the two can disagree.
  // The specialist agents' currentConditions scores (shown in the AI Agents cards) are the
  // authoritative "right now" numbers, so the breakdown's "Current" column must match them exactly.
  const scenariosForBreakdown = data.scenarios && {
    ...data.scenarios,
    2026: {
      ...data.scenarios['2026'],
      climateScore: data.currentConditions?.climateScore ?? null,
      accessibilityScore: data.currentConditions?.accessibilityScore ?? null,
      housingScore: data.currentConditions?.housingScore ?? null,
    },
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-slate-950">
      <TopHeader
        siteName={data.site?.name}
        areaKm2={data.site?.areaKm2}
        population={data.site?.population}
        onLocationSelected={handleLocationSelected}
        conditions={conditions}
        aqiInfo={aqiInfo}
        heatRisk={heatRisk}
        floodRisk={floodRisk}
        WeatherIcon={WeatherIcon}
      />

      <ControlStrip
        goal={goal}
        setGoal={setGoal}
        years={SCENARIO_YEARS}
        selectedScenario={selectedScenario}
        selectScenario={selectScenario}
        onAnalyze={handleAnalyze}
        analyzing={analysisState === 'running'}
        analyzeDisabled={!goal.trim() || analysisState === 'running'}
        analysisError={analysisError}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Left content panel: present-day view, AI agent cards */}
        <div className="w-[320px] shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            <PresentDayView location={selectedLocation} />

            {analysisState === 'idle' && (
              <div>
                <div className="text-xs text-slate-500 mb-2">Suggested planning goals</div>
                <div className="flex flex-wrap gap-1.5">
                  {GOAL_CHIPS.map(chip => (
                    <button
                      key={chip}
                      onClick={() => setGoal(chip)}
                      className="text-[11px] px-2.5 py-1.5 rounded-full bg-slate-800/60 hover:bg-slate-700 border border-slate-700/60 text-slate-300 transition-colors">
                      {chip}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {(analysisState === 'running' || analysisState === 'complete') && (
              <div className="bg-slate-800/50 border border-slate-700/60 rounded-lg px-4 py-3">
                <div className="text-xs text-slate-500 mb-2">Agent pipeline</div>
                {AGENTS.map(a => (
                  <AgentRow key={a.id} label={a.label} status={agentStatuses[a.id]} />
                ))}
              </div>
            )}

            {analysisState === 'complete' && (
              <>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 px-1">
                  <BarChart3 className="w-3.5 h-3.5" /> AI Agents
                </div>
                <AgentCard label="Climate Agent" icon={ThermometerSun} iconBg="bg-emerald-900/40" iconColor="text-emerald-400" scoreColor="text-emerald-400"
                  score={climateAgent?.score} bullets={climateAgent?.findings} summary={climateAgent?.summary}
                  climateAvailable={climateAgent?.climateAvailable} climateData={climateAgent?.climateData} />
                <AgentCard label="Accessibility Agent" icon={Bike} iconBg="bg-sky-900/40" iconColor="text-sky-400" scoreColor="text-sky-400"
                  score={accessibilityAgent?.score} bullets={accessibilityAgent?.findings} summary={accessibilityAgent?.summary}
                  transitAvailable={accessibilityAgent?.transitAvailable} transitData={accessibilityAgent?.transitData} />
                <AgentCard label="Housing Agent" icon={Building2} iconBg="bg-amber-900/40" iconColor="text-amber-400" scoreColor="text-amber-400"
                  score={housingAgent?.score} bullets={housingAgent?.findings} summary={housingAgent?.summary}
                  censusAvailable={housingAgent?.censusAvailable} censusData={housingAgent?.censusData} />
                <AgentCard label="Urban Design Agent" icon={Compass} iconBg="bg-violet-900/40" iconColor="text-violet-400" scoreColor="text-violet-400"
                  score={null} bullets={urbanDesignAgent?.strategy?.immediate} summary={urbanDesignAgent?.summary} />

                {data.currentConditions?.overallScore != null && (
                  <div className="bg-slate-800/50 border border-emerald-700/40 rounded-lg px-4 py-3 flex items-center justify-between">
                    <span className="text-xs text-slate-400">Overall Score</span>
                    <span className="text-lg font-bold text-emerald-400">{data.currentConditions.overallScore}<span className="text-xs text-slate-500 font-normal">/100</span></span>
                  </div>
                )}

                <div className="text-[11px] text-slate-700 pb-2">
                  {data.dataDisclosure?.limitations?.[0]}
                </div>
              </>
            )}
          </div>
        </div>

        <MainMapPanel
          selectedLocation={selectedLocation}
          analysisState={analysisState}
          selectedScenario={selectedScenario}
          selectScenario={selectScenario}
          visualizedImages={visualizedImages}
          presentPhotoUrl={presentPhotoUrl}
          presentPhotoSource={presentPhotoSource}
          data={data}
          scenarioYears={SCENARIO_YEARS}
          userVisionText={userVisionText}
          setUserVisionText={setUserVisionText}
          referenceImage={referenceImage}
          setReferenceImage={setReferenceImage}
          handleGenerateVisualization={handleGenerateVisualization}
          visualizingYear={visualizingYear}
          visualizeError={visualizeError}
          copied={copied}
          setCopied={setCopied}
        />

        {/* Right analysis panel — only shows real output from a completed analysis; never the
            pre-search Berkeley placeholder, which would look like real scores for no reason. */}
        <div className="w-[300px] shrink-0 bg-slate-900 border-l border-slate-800 overflow-y-auto px-4 py-4 space-y-3">
          {analysisState === 'complete' ? (
            <>
              <CurrentConditionsPanel
                climateAvailable={climateAgent?.climateAvailable} climateData={climateAgent?.climateData}
                transitAvailable={accessibilityAgent?.transitAvailable} transitData={accessibilityAgent?.transitData}
                censusAvailable={housingAgent?.censusAvailable} censusData={housingAgent?.censusData}
              />
              <ScoreBreakdownPanel scenarios={scenariosForBreakdown} years={SCENARIO_YEARS} selectedYear={selectedScenario} />
              <RisksPanel risks={allRisks} />
              <RecommendationsPanel recommendations={allRecs} />
              <InterventionsPanel recommendations={allRecs} />
            </>
          ) : (
            <div className="flex flex-col items-center justify-center text-center h-full text-slate-500 px-2">
              <Sparkles className="w-6 h-6 mb-2 text-slate-600" />
              <p className="text-xs">Scores, risks, and recommendations will appear here after you run an analysis.</p>
            </div>
          )}
        </div>
      </div>

      <AIAssistantPanel
        chatMessages={chatMessages}
        chatInput={chatInput}
        setChatInput={setChatInput}
        chatLoading={chatLoading}
        onAsk={handleAsk}
        enabled={analysisState === 'complete'}
      />
    </div>
  );
}
