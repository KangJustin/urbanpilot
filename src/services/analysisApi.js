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

export async function generateVisualization(prompt, referenceImage) {
  const res = await fetch(`${API_BASE}/api/visualize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, referenceImage }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Visualize API error: ${res.status}`);
  }
  return res.json();
}

export async function askQuestion(question, site, data) {
  const res = await fetch(`${API_BASE}/api/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, site, data }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Ask API error: ${res.status}`);
  }
  return res.json();
}

export async function autocompleteLocation(input, signal) {
  const res = await fetch(`${API_BASE}/api/location/autocomplete?input=${encodeURIComponent(input)}`, { signal });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Autocomplete API error: ${res.status}`);
  }
  return res.json();
}

export async function getPlaceDetails(placeId) {
  const res = await fetch(`${API_BASE}/api/location/details?placeId=${encodeURIComponent(placeId)}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Place details API error: ${res.status}`);
  }
  return res.json();
}

export async function getStreetViewStatus(lat, lon) {
  const res = await fetch(`${API_BASE}/api/location/street-view-status?lat=${lat}&lon=${lon}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Street View status API error: ${res.status}`);
  }
  return res.json();
}

export async function uploadReferenceImage(file, licenseConfirmed) {
  const formData = new FormData();
  formData.append('image', file);
  formData.append('licenseConfirmed', String(licenseConfirmed));
  const res = await fetch(`${API_BASE}/api/upload/reference-image`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Upload API error: ${res.status}`);
  }
  return res.json();
}
