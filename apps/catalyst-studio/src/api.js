const BASE = '';

async function fetchJSON(path) {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

export async function getHealth() {
  return fetchJSON('/api/status');
}

export async function getModules() {
  return fetchJSON('/api/modules');
}

export async function getPolicies() {
  return fetchJSON('/api/policies');
}

export async function getEvents() {
  return fetchJSON('/api/events');
}

export async function getArcadeLeaderboard() {
  return fetchJSON('/api/arcade/leaderboard');
}

export async function getSystemStatus() {
  return fetchJSON('/health');
}

// RPC proxy to local Geth node
export async function ethRPC(method, params = []) {
  const res = await fetch(`${BASE}/api/rpc`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', method, params, id: 1 }),
  });
  if (!res.ok) throw new Error(`${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.result;
}
