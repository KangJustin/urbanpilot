export const DEFAULT_LOCATION = {
  placeId: null,
  displayName: 'Downtown Berkeley, CA',
  formattedAddress: 'Downtown Berkeley, CA',
  latitude: 37.8703,
  longitude: -122.2677,
};

export const AGENTS = [
  { id: 'coordinator', label: 'Coordinator' },
  { id: 'climate', label: 'Climate Agent' },
  { id: 'accessibility', label: 'Accessibility Agent' },
  { id: 'housing', label: 'Housing Agent' },
  { id: 'urban_design', label: 'Urban Design Agent' },
];

export const RESULT_TABS = [
  { id: 'recs', label: 'Plan' },
  { id: 'risks', label: 'Risks' },
  { id: 'scenarios', label: 'Future' },
  { id: 'ask', label: 'Ask AI' },
];

export const SCENARIO_YEARS = ['2026', '2040', '2075'];

export const SUGGESTED_QUESTIONS = [
  'How will this area handle extreme heat?',
  'What is the impact of increasing density here?',
  'Which recommendation has the biggest equity benefit?',
  'What are the biggest risks if we do nothing?',
];
