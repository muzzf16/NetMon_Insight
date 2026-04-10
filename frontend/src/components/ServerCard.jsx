import { useNavigate } from 'react-router-dom';
import { Server, Cpu, MemoryStick, HardDrive, Gauge } from 'lucide-react';
import StatusIndicator from './StatusIndicator';

function MiniMetric({ icon: Icon, label, value, unit, warning, critical }) {
  let colorClass = '';
  if (critical && value >= critical) colorClass = 'text-critical';
  else if (warning && value >= warning) colorClass = 'text-warning';
  else colorClass = 'text-ok';

  return (
    <div style={styles.miniMetric}>
      <Icon size={14} style={{ opacity: 0.5 }} />
      <span style={styles.miniLabel}>{label}</span>
      <span className={`mono ${colorClass}`} style={styles.miniValue}>
        {value !== null && value !== undefined ? `${value.toFixed(1)}${unit}` : '—'}
      </span>
    </div>
  );
}

export default function ServerCard({ server }) {
  const navigate = useNavigate();

  const status = server.status || 'offline';

  return (
    <div
      className="card"
      onClick={() => navigate(`/server/${server.id}`)}
      style={{ cursor: 'pointer' }}
      id={`server-card-${server.id}`}
    >
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.serverIcon}>
            <Server size={18} color="var(--accent-cyan)" />
          </div>
          <div>
            <div style={styles.hostname}>{server.hostname}</div>
            <div style={styles.ip} className="mono">{server.ip_address || '—'}</div>
          </div>
        </div>
        <div style={styles.statusArea}>
          <StatusIndicator status={status} />
          {server.alert_count > 0 && (
            <span className="badge critical" style={{ marginLeft: 8 }}>
              {server.alert_count}
            </span>
          )}
        </div>
      </div>

      {/* Metrics */}
      <div style={styles.metricsGrid}>
        <MiniMetric icon={Cpu} label="CPU" value={server.cpu_usage} unit="%" warning={80} critical={95} />
        <MiniMetric icon={MemoryStick} label="MEM" value={server.memory_usage} unit="%" warning={85} critical={95} />
        <MiniMetric icon={HardDrive} label="DISK" value={server.disk_usage} unit="%" warning={85} critical={95} />
        <MiniMetric icon={Gauge} label="Latency" value={server.latency} unit="ms" warning={50} critical={100} />
      </div>
    </div>
  );
}

const styles = {
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  serverIcon: {
    width: 38,
    height: 38,
    borderRadius: 'var(--radius-sm)',
    background: 'rgba(6, 182, 212, 0.08)',
    border: '1px solid rgba(6, 182, 212, 0.15)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hostname: {
    fontWeight: 600,
    fontSize: '0.95rem',
    color: 'var(--text-primary)',
  },
  ip: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
  },
  statusArea: {
    display: 'flex',
    alignItems: 'center',
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '8px 16px',
  },
  miniMetric: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 0',
  },
  miniLabel: {
    fontSize: '0.72rem',
    color: 'var(--text-muted)',
    flex: 1,
  },
  miniValue: {
    fontSize: '0.82rem',
    fontWeight: 600,
  },
};
