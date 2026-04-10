import { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, CheckCircle, Filter } from 'lucide-react';
import { api } from '../services/api';
import wsClient from '../services/websocket';
import AlertBadge from '../components/AlertBadge';

export default function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [summary, setSummary] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  const fetchAlerts = useCallback(async () => {
    try {
      const params = {};
      if (filter !== 'all') params.severity = filter;
      const data = await api.getAlerts(params);
      setAlerts(data.alerts || []);
      setSummary(data.summary || []);
    } catch (err) {
      console.error('Error fetching alerts:', err);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 15000);
    const unsub = wsClient.on('metrics_update', (data) => {
      if (data.alerts && data.alerts.length > 0) fetchAlerts();
    });
    return () => { clearInterval(interval); unsub(); };
  }, [fetchAlerts]);

  const handleAcknowledge = async (alertId) => {
    try {
      await api.acknowledgeAlert(alertId);
      fetchAlerts();
    } catch (err) {
      console.error('Failed to acknowledge:', err);
    }
  };

  const totalWarnings = summary.find(s => s.severity === 'WARNING')?.count || 0;
  const totalCritical = summary.find(s => s.severity === 'CRITICAL')?.count || 0;

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner" />
        <span>Loading alerts...</span>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Alerts</h1>
          <p className="page-subtitle">Monitor and manage all system alerts</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid-3 mb-3">
        <div className="card" onClick={() => setFilter('all')} style={{ cursor: 'pointer' }}>
          <div className="card-header">
            <span className="card-title">Total Active</span>
            <AlertTriangle size={16} style={{ opacity: 0.4 }} />
          </div>
          <div className="stat-value">{totalWarnings + totalCritical}</div>
        </div>

        <div className="card" onClick={() => setFilter('WARNING')} style={{ cursor: 'pointer' }}>
          <div className="card-header">
            <span className="card-title">Warnings</span>
          </div>
          <div className={`stat-value ${totalWarnings > 0 ? 'warning' : ''}`}>{totalWarnings}</div>
        </div>

        <div className="card" onClick={() => setFilter('CRITICAL')} style={{ cursor: 'pointer' }}>
          <div className="card-header">
            <span className="card-title">Critical</span>
          </div>
          <div className={`stat-value ${totalCritical > 0 ? 'critical' : ''}`}>{totalCritical}</div>
        </div>
      </div>

      {/* Filter pills */}
      <div style={styles.filterBar}>
        <Filter size={14} style={{ opacity: 0.4 }} />
        {['all', 'CRITICAL', 'WARNING'].map(f => (
          <button
            key={f}
            className={`btn ${filter === f ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setFilter(f)}
            style={{ fontSize: '0.8rem', padding: '6px 12px' }}
          >
            {f === 'all' ? 'All' : f}
          </button>
        ))}
      </div>

      {/* Alerts table */}
      <div className="card">
        {alerts.length === 0 ? (
          <div className="empty-state">
            <CheckCircle size={40} style={{ color: 'var(--status-ok)' }} />
            <h3 style={{ marginTop: 12 }}>All clear!</h3>
            <p className="text-sm text-muted">No alerts matching the current filter.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Server</th>
                  <th>Severity</th>
                  <th>Type</th>
                  <th>Message</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {alerts.map(alert => (
                  <tr key={alert.id} style={{ opacity: alert.acknowledged ? 0.5 : 1 }}>
                    <td className="mono text-xs" style={{ whiteSpace: 'nowrap' }}>
                      {new Date(alert.created_at).toLocaleString()}
                    </td>
                    <td style={{ fontWeight: 600 }}>{alert.hostname}</td>
                    <td><AlertBadge severity={alert.severity} /></td>
                    <td className="mono text-xs">{alert.type}</td>
                    <td style={{ maxWidth: 400, fontSize: '0.825rem' }}>{alert.message}</td>
                    <td>
                      {!alert.acknowledged && (
                        <button
                          className="btn btn-ghost"
                          style={{ fontSize: '0.72rem', padding: '4px 8px' }}
                          onClick={() => handleAcknowledge(alert.id)}
                        >
                          Acknowledge
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  filterBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
};
