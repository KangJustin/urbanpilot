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
