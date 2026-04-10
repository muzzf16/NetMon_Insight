import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Cpu, MemoryStick, HardDrive, Gauge, Network, Lightbulb, AlertTriangle } from 'lucide-react';
import { api } from '../services/api';
import wsClient from '../services/websocket';
import MetricChart from '../components/MetricChart';
import StatusIndicator from '../components/StatusIndicator';
import AlertBadge from '../components/AlertBadge';

export default function ServerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [detail, setDetail] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [detailData, metricsData, insightsData] = await Promise.all([
        api.getServer(id),
        api.getMetrics(id, { limit: 60 }),
        api.getInsights(id),
      ]);
      setDetail(detailData);
      setMetrics(metricsData);
      setInsights(insightsData.insights || []);
    } catch (err) {
      console.error('Error fetching server detail:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    const unsub = wsClient.on('metrics_update', (data) => {
      if (data.server_id === id) fetchData();
    });
    return () => { clearInterval(interval); unsub(); };
  }, [id, fetchData]);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner" />
        <span>Loading server detail...</span>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="empty-state">
        <h3>Server not found</h3>
        <button className="btn btn-ghost mt-2" onClick={() => navigate('/')}>← Back to Dashboard</button>
      </div>
    );
  }

  const { server, latest_metric, latest_network, latest_interfaces, recent_alerts } = detail;

  // Prepare chart data (reverse to show oldest → newest)
  const cpuData = metrics?.metrics?.map(m => ({
    cpu_usage: m.cpu_usage,
    memory_usage: m.memory_usage,
    disk_usage: m.disk_usage,
    timestamp: m.timestamp,
  })).reverse() || [];

  const networkData = metrics?.network_metrics?.map(m => ({
    latency: m.latency,
    packet_loss: m.packet_loss,
    jitter: m.jitter,
    timestamp: m.timestamp,
  })).reverse() || [];

  return (
    <div>
      {/* Header */}
      <div style={styles.header}>
        <button className="btn btn-ghost" onClick={() => navigate('/')} style={{ marginRight: 16 }}>
          <ArrowLeft size={16} /> Back
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h1 className="page-title">{server.hostname}</h1>
            <StatusIndicator status={server.status} size={12} />
          </div>
          <p className="page-subtitle mono">{server.ip_address || '—'}</p>
        </div>
      </div>

      {/* Smart Insights */}
      {insights.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h2 style={styles.sectionTitle}>
            <Lightbulb size={16} color="var(--accent-cyan)" />
            Smart Insights
          </h2>
          {insights.map((insight, i) => (
            <div key={i} className={`insight-card ${insight.level}`}>
              <div className="insight-title">
                {insight.level === 'critical' ? '🔴' : '🟡'} {insight.title}
              </div>
              <div className="insight-message">{insight.message}</div>
              <div className="insight-suggestion">💡 {insight.suggestion}</div>
            </div>
          ))}
        </div>
      )}

      {/* Current Metrics */}
      <div className="grid-4 mb-3">
        <div className="card">
          <div className="card-header">
            <span className="card-title">CPU</span>
            <Cpu size={16} style={{ opacity: 0.4 }} />
          </div>
          <div className={`stat-value ${latest_metric?.cpu_usage > 80 ? 'critical' : ''}`}>
            {latest_metric?.cpu_usage?.toFixed(1) || '—'}<span style={{ fontSize: '0.9rem' }}>%</span>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Memory</span>
            <MemoryStick size={16} style={{ opacity: 0.4 }} />
          </div>
          <div className={`stat-value ${latest_metric?.memory_usage > 85 ? 'warning' : ''}`}>
            {latest_metric?.memory_usage?.toFixed(1) || '—'}<span style={{ fontSize: '0.9rem' }}>%</span>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Disk</span>
            <HardDrive size={16} style={{ opacity: 0.4 }} />
          </div>
          <div className="stat-value">
            {latest_metric?.disk_usage?.toFixed(1) || '—'}<span style={{ fontSize: '0.9rem' }}>%</span>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Latency</span>
            <Gauge size={16} style={{ opacity: 0.4 }} />
          </div>
          <div className={`stat-value ${latest_network?.latency > 50 ? 'warning' : ''} ${latest_network?.latency > 100 ? 'critical' : ''}`}>
            {latest_network?.latency?.toFixed(1) || '—'}<span style={{ fontSize: '0.9rem' }}>ms</span>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid-2 mb-3">
        <div className="card">
          <div className="card-header">
            <span className="card-title">CPU Usage (History)</span>
          </div>
          <MetricChart data={cpuData} dataKey="cpu_usage" name="CPU" unit="%" color="#3b82f6" height={220} />
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Memory Usage (History)</span>
          </div>
          <MetricChart data={cpuData} dataKey="memory_usage" name="Memory" unit="%" color="#8b5cf6" height={220} />
        </div>
      </div>

      <div className="grid-2 mb-3">
        <div className="card">
          <div className="card-header">
            <span className="card-title">Latency (History)</span>
          </div>
          <MetricChart data={networkData} dataKey="latency" name="Latency" unit="ms" color="#ef4444" height={220} />
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Packet Loss (History)</span>
          </div>
          <MetricChart data={networkData} dataKey="packet_loss" name="Packet Loss" unit="%" color="#f59e0b" height={220} />
        </div>
      </div>

      {/* Interface Metrics */}
      {latest_interfaces && latest_interfaces.length > 0 && (
        <div className="card mb-3">
          <div className="card-header">
            <span className="card-title">
              <Network size={16} style={{ marginRight: 6, opacity: 0.5 }} />
              Interface Metrics
            </span>
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Interface</th>
                  <th>Speed</th>
                  <th>RX Bytes</th>
                  <th>TX Bytes</th>
                  <th>RX Dropped</th>
                  <th>RX Errors</th>
                </tr>
              </thead>
              <tbody>
                {latest_interfaces.map((iface, i) => (
                  <tr key={i}>
                    <td className="mono" style={{ fontWeight: 600 }}>{iface.interface_name}</td>
                    <td>
                      <span className={iface.speed < 1000 ? 'text-warning' : 'text-ok'} style={{ fontWeight: 600 }}>
                        {iface.speed} Mbps
                      </span>
                    </td>
                    <td className="mono">{formatBytes(iface.rx_bytes)}</td>
                    <td className="mono">{formatBytes(iface.tx_bytes)}</td>
                    <td>
                      <span className={iface.rx_dropped > 0 ? 'text-critical' : ''} style={{ fontWeight: iface.rx_dropped > 0 ? 700 : 400 }}>
                        {iface.rx_dropped.toLocaleString()}
                      </span>
                    </td>
                    <td>
                      <span className={iface.rx_errors > 0 ? 'text-warning' : ''}>
                        {iface.rx_errors}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent Alerts */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">
            <AlertTriangle size={16} style={{ marginRight: 6, opacity: 0.5 }} />
            Recent Alerts
          </span>
        </div>
        {recent_alerts && recent_alerts.length > 0 ? (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Severity</th>
                  <th>Type</th>
                  <th>Message</th>
                </tr>
              </thead>
              <tbody>
                {recent_alerts.map(alert => (
                  <tr key={alert.id}>
                    <td className="mono text-xs" style={{ whiteSpace: 'nowrap' }}>
                      {new Date(alert.created_at).toLocaleString()}
                    </td>
                    <td><AlertBadge severity={alert.severity} /></td>
                    <td className="mono text-xs">{alert.type}</td>
                    <td style={{ maxWidth: 400 }}>{alert.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-muted text-sm">No alerts recorded for this server.</p>
        )}
      </div>
    </div>
  );
}

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

const styles = {
  header: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: 28,
    paddingBottom: 20,
    borderBottom: '1px solid var(--border-subtle)',
  },
  sectionTitle: {
    fontSize: '0.85rem',
    fontWeight: 600,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    marginBottom: 12,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
};
