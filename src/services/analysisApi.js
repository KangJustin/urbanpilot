const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export async function analyzeNeighborhood(request) {
  const res = await fetch(`${API_BASE}/api/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  if (!res.ok) throw new Error(`Analysis API error: ${res.status}`);
  return res.json();
}

export async function getConditions(lat, lon) {
  const res = await fetch(`${API_BASE}/api/conditions?lat=${lat}&lon=${lon}`);
  if (!res.ok) throw new Error(`Conditions API error: ${res.status}`);
  return res.json();
}

export async function generateVisualization(prompt) {
  const res = await fetch(`${API_BASE}/api/visualize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Visualize API error: ${res.status}`);
  }
  return res.json();
}
