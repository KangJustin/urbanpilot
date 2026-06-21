import React, { useState, useEffect } from 'react';
import {
  Sun, Cloud, CloudRain, CloudSnow, CloudLightning, CloudFog,
} from 'lucide-react';
import {
  analyzeNeighborhood, generateVisualization, getConditions, askQuestion,
  getStreetViewStatus, streetViewImageUrl, satelliteImageUrl,
} from './services/analysisApi';
import StreetViewPanel from './components/StreetViewPanel';
import TopHeader from './components/TopHeader';
import ControlStrip from './components/ControlStrip';
import DataMethodologySection from './components/DataMethodologySection';
import AnalysisStatusBar from './components/AnalysisStatusBar';
import ScoreBreakdownPanel from './components/ScoreBreakdownPanel';
import CurrentConditionsPanel from './components/CurrentConditionsPanel';
import PlanningFindings from './components/PlanningFindings';
import MainMapPanel from './components/MainMapPanel';
import AIAssistantPanel from './components/AIAssistantPanel';
import ReadyToAnalyzeCard from './components/ReadyToAnalyzeCard';
import ProjectedScenarioChanges from './components/ProjectedScenarioChanges';
import VisualizeStreetscapeAction from './components/VisualizeStreetscapeAction';

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

// FEMA NFHL-derived, not AI — femaFloodRisk is a deterministic lookup over the verified
// flood zone/SFHA fields (server/services/femaNfhlService.js: floodRiskFromZone()). No
// verified heat-risk dataset exists anywhere in this codebase (heat island is Claude
// narrative only), so there's no equivalent getHeatRisk — the header no longer shows one
// rather than label an AI guess as a risk badge.
function getFloodRisk(climate) {
  const fema = climate?.climateData;
  if (!climate?.climateAvailable || fema?.femaFloodRisk == null) return null;
  return { label: fema.femaFloodRisk };
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
  const isResults = analysisState === 'complete';

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
    <div className="h-screen flex flex-col overflow-hidden bg-civic-bg">
      <TopHeader
        siteName={data.site?.name}
        areaKm2={data.site?.areaKm2}
        population={data.site?.population}
        onLocationSelected={handleLocationSelected}
        conditions={conditions}
        aqiInfo={aqiInfo}
        floodRisk={floodRisk}
        WeatherIcon={WeatherIcon}
      />

      {isResults && (
        <ControlStrip
          variant="strip"
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
      )}

      {!isResults && (
        // Pre-analysis landing state: balanced onboarding / map / preview columns (target
        // 35-40% / 35-40% / 20-25% at desktop), stacked single-column below lg (1024px).
        // Collapsible Street View sits full-width below the three columns, collapsed by default.
        <div className="flex-1 flex flex-col overflow-y-auto">
          <div className="flex-1 flex flex-col lg:flex-row">
            <div className="order-1 w-full lg:w-[37%] shrink-0 border-b lg:border-b-0 lg:border-r border-civic-border px-4 sm:px-5 py-4 lg:overflow-y-auto space-y-4">
              <ControlStrip
                variant="panel"
                goalChips={GOAL_CHIPS}
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
              <AnalysisStatusBar
                analysisState={analysisState}
                analysisError={analysisError}
                agentStatuses={agentStatuses}
                agents={AGENTS}
              />
            </div>

            <div className="order-2 w-full lg:w-[37%] min-h-[360px] lg:min-h-0 shrink-0 flex flex-col border-b lg:border-b-0 lg:border-r border-civic-border">
              <MainMapPanel
                selectedLocation={selectedLocation}
                analysisState={analysisState}
                selectedScenario={selectedScenario}
                visualizedImages={visualizedImages}
                presentPhotoUrl={presentPhotoUrl}
                data={data}
              />
            </div>

            <div className="order-3 w-full lg:w-[26%] shrink-0 px-4 sm:px-5 py-4">
              <ReadyToAnalyzeCard />
            </div>
          </div>

          <div className="shrink-0 border-t border-civic-border px-4 sm:px-5 py-3">
            <StreetViewPanel location={selectedLocation} />
          </div>
        </div>
      )}

      {isResults && (
        // Two workspaces from one flat grid: every item carries both an `order` (the exact
        // mobile/tablet reading sequence from the spec) and an `lg:col-start` (which workspace it
        // belongs to at 1024px+). Below lg, col-start is unset, so the grid collapses to a single
        // column and items fall into the interleaved order; at lg+, `grid-flow-dense` backfills
        // each column's empty cells (sparse, the default, only scans forward from the last-placed
        // cell and leaves column 2 blank for as many rows as column 1 has shorter items stacked
        // ahead of it — dense fixes that and gives the intended independent-column stacking).
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-[59fr_41fr] lg:grid-flow-dense gap-3 lg:gap-x-6 lg:gap-y-4 px-4 sm:px-5 py-4">
            <div className="order-1 lg:col-start-1">
              <CurrentConditionsPanel
                climateAvailable={climateAgent?.climateAvailable} climateData={climateAgent?.climateData}
                transitAvailable={accessibilityAgent?.transitAvailable} transitData={accessibilityAgent?.transitData}
                censusAvailable={housingAgent?.censusAvailable} censusData={housingAgent?.censusData}
              />
            </div>

            <div className="order-2 lg:col-start-1">
              <ScoreBreakdownPanel scenarios={scenariosForBreakdown} years={SCENARIO_YEARS} selectedYear={selectedScenario} />
            </div>

            <div className="order-3 lg:col-start-1">
              <PlanningFindings risks={allRisks} recommendations={allRecs} />
            </div>

            <div className="order-4 lg:col-start-2 h-[420px] lg:h-[460px] flex flex-col rounded-lg border border-civic-border overflow-hidden">
              <MainMapPanel
                selectedLocation={selectedLocation}
                analysisState={analysisState}
                selectedScenario={selectedScenario}
                visualizedImages={visualizedImages}
                presentPhotoUrl={presentPhotoUrl}
                data={data}
              />
            </div>

            <div className="order-5 lg:col-start-2">
              <ProjectedScenarioChanges data={data} selectedScenario={selectedScenario} presentPhotoSource={presentPhotoSource} />
            </div>

            <div className="order-6 lg:col-start-2">
              <StreetViewPanel location={selectedLocation} />
            </div>

            <div className="order-7 lg:col-start-1">
              <DataMethodologySection
                climateAgent={climateAgent}
                accessibilityAgent={accessibilityAgent}
                housingAgent={housingAgent}
                urbanDesignAgent={urbanDesignAgent}
                overallScore={data.currentConditions?.overallScore}
                limitationsText={data.dataDisclosure?.limitations?.[0]}
              />
            </div>

            <div className="order-8 lg:col-start-1">
              <VisualizeStreetscapeAction
                data={data}
                selectedScenario={selectedScenario}
                visualizedImages={visualizedImages}
                visualizingYear={visualizingYear}
                visualizeError={visualizeError}
                handleGenerateVisualization={handleGenerateVisualization}
                copied={copied}
                setCopied={setCopied}
                userVisionText={userVisionText}
                setUserVisionText={setUserVisionText}
                referenceImage={referenceImage}
                setReferenceImage={setReferenceImage}
                presentPhotoUrl={presentPhotoUrl}
              />
            </div>

            <div className="order-9 lg:col-start-1">
              <AnalysisStatusBar
                analysisState={analysisState}
                analysisError={analysisError}
                agentStatuses={agentStatuses}
                agents={AGENTS}
              />
            </div>
          </div>
        </div>
      )}

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
