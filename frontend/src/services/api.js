const API_BASE = '/api/v1';

async function request(url, options = {}) {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    throw new Error(`API Error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export const api = {
  // Servers
  getServers: () => request('/servers'),
  getServer: (id) => request(`/servers/${id}`),

  // Metrics
  getMetrics: (serverId, params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/servers/metrics/${serverId}${qs ? `?${qs}` : ''}`);
  },

  // Alerts
  getAlerts: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/alerts${qs ? `?${qs}` : ''}`);
  },
  acknowledgeAlert: (id) => request(`/alerts/${id}/acknowledge`, { method: 'PATCH' }),

  // Insights
  getInsights: (serverId) => request(`/insights/${serverId}`),

  // Health
  health: () => fetch('/api/health').then(r => r.json()),
};
