import { useState, useEffect, useCallback } from 'react';
import { Server, AlertTriangle, Activity, Wifi } from 'lucide-react';
import { api } from '../services/api';
import wsClient from '../services/websocket';
import ServerCard from '../components/ServerCard';

export default function Dashboard() {
  const [servers, setServers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [alertSummary, setAlertSummary] = useState({ warning: 0, critical: 0 });
  const [lastUpdate, setLastUpdate] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const [serversData, alertsData] = await Promise.all([
        api.getServers(),
        api.getAlerts({ limit: 1 }),
      ]);
      setServers(serversData);

      // Parse alert summary
      const summary = { warning: 0, critical: 0 };
      if (alertsData.summary) {
        alertsData.summary.forEach(s => {
          if (s.severity === 'WARNING') summary.warning = s.count;
          if (s.severity === 'CRITICAL') summary.critical = s.count;
        });
      }
      setAlertSummary(summary);
      setLastUpdate(new Date());
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);

    // Real-time updates via WebSocket
    const unsub = wsClient.on('metrics_update', () => {
      fetchData();
    });

    return () => {
      clearInterval(interval);
      unsub();
    };
  }, [fetchData]);

  // Compute summary stats
  const totalServers = servers.length;
  const onlineServers = servers.filter(s => s.status === 'online' || s.status === 'critical').length;
  const avgLatency = servers.length
    ? (servers.reduce((sum, s) => sum + (s.latency || 0), 0) / servers.length).toFixed(1)
    : '0';

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner" />
        <span>Loading dashboard...</span>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">
            Real-time overview of all monitored servers
            {lastUpdate && (
              <span style={{ marginLeft: 12, opacity: 0.5 }}>
                Updated: {lastUpdate.toLocaleTimeString()}
              </span>
            )}
          </p>
        </div>
      </div>

      {error && (
        <div style={styles.errorBanner}>
          ⚠️ {error} — Make sure the backend is running on port 3001
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid-4" style={{ marginBottom: 28 }}>
        <div className="card">
          <div className="card-header">
            <span className="card-title">Total Servers</span>
            <Server size={18} style={{ opacity: 0.4 }} />
          </div>
          <div className="stat-value">{totalServers}</div>
          <div className="stat-label">{onlineServers} online</div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Avg Latency</span>
            <Activity size={18} style={{ opacity: 0.4 }} />
          </div>
          <div className={`stat-value ${parseFloat(avgLatency) > 50 ? 'warning' : ''}`}>
            {avgLatency}<span style={{ fontSize: '1rem' }}>ms</span>
          </div>
          <div className="stat-label">across all servers</div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Warnings</span>
            <AlertTriangle size={18} style={{ color: 'var(--status-warning)', opacity: 0.7 }} />
          </div>
          <div className={`stat-value ${alertSummary.warning > 0 ? 'warning' : ''}`}>
            {alertSummary.warning}
          </div>
          <div className="stat-label">active warnings</div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Critical</span>
            <AlertTriangle size={18} style={{ color: 'var(--status-critical)', opacity: 0.7 }} />
          </div>
          <div className={`stat-value ${alertSummary.critical > 0 ? 'critical' : ''}`}>
            {alertSummary.critical}
          </div>
          <div className="stat-label">critical alerts</div>
        </div>
      </div>

      {/* Server Cards */}
      {servers.length === 0 ? (
        <div className="empty-state">
          <Wifi size={48} />
          <h3>No servers detected yet</h3>
          <p className="text-sm text-muted" style={{ marginTop: 8 }}>
            Start the agent simulator to begin monitoring.
            <br />
            <code className="mono" style={{ color: 'var(--accent-cyan)' }}>
              cd agent && node src/simulator.js
            </code>
          </p>
        </div>
      ) : (
        <div>
          <h2 style={styles.sectionTitle}>
            <Server size={18} />
            Servers
          </h2>
          <div className="grid-3">
            {servers.map(server => (
              <ServerCard key={server.id} server={server} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  sectionTitle: {
    fontSize: '0.85rem',
    fontWeight: 600,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    marginBottom: 16,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  errorBanner: {
    padding: '12px 16px',
    background: 'var(--status-critical-bg)',
    border: '1px solid var(--status-critical-border)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--status-critical)',
    fontSize: '0.875rem',
    marginBottom: 20,
  },
};
