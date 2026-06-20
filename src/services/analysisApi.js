export async function analyzeNeighborhood(request) {
  const res = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  if (!res.ok) throw new Error(`Analysis API error: ${res.status}`);
  return res.json();
}
