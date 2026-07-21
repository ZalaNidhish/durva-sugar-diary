// Base URL of the backend API. Set VITE_API_URL in a .env file when you
// deploy the backend somewhere (e.g. Render, Railway) so the frontend can
// reach it from anywhere.
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/entries';

async function handleResponse(res) {
  const body = await res.json();
  if (!res.ok) {
    const message = (body.errors && body.errors.join(', ')) || 'Request failed';
    throw new Error(message);
  }
  return body;
}

export async function getEntriesByDate(dateStr) {
  const res = await fetch(`${API_URL}/day/${dateStr}`);
  return handleResponse(res);
}

export async function createEntry(data) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function updateEntry(id, data) {
  const res = await fetch(`${API_URL}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function deleteEntry(id) {
  const res = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
  return handleResponse(res);
}

// dateStr is 'YYYY-MM-DD'. Returns every reading for that one day.
export async function getDailyAnalysis(dateStr) {
  const res = await fetch(`${API_URL}/analysis/daily/${dateStr}`);
  return handleResponse(res);
}

// dateStr is any 'YYYY-MM-DD' date inside the desired week; the backend
// resolves it to that week's Mon-Sun range.
export async function getWeeklyAnalysis(dateStr) {
  const res = await fetch(`${API_URL}/analysis/weekly/${dateStr}`);
  return handleResponse(res);
}