import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, AlertTriangle, Activity, Server } from 'lucide-react';
import { useState, useEffect } from 'react';
import wsClient from '../services/websocket';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/alerts', label: 'Alerts', icon: AlertTriangle },
];

export default function Sidebar() {
  const location = useLocation();
  const [wsStatus, setWsStatus] = useState('disconnected');

  useEffect(() => {
    wsClient.connect();
    const unsub = wsClient.on('connection', ({ status }) => setWsStatus(status));
    return () => {
      unsub();
      wsClient.disconnect();
    };
  }, []);

  return (
    <aside style={styles.sidebar}>
      {/* Logo */}
      <div style={styles.logoArea}>
        <div style={styles.logoIcon}>
          <Activity size={24} color="#06b6d4" />
        </div>
        <div>
          <h1 style={styles.logoTitle}>NetMon</h1>
          <span style={styles.logoSub}>Insight</span>
        </div>
      </div>

      {/* Navigation */}
      <nav style={styles.nav}>
        <div style={styles.navLabel}>MONITORING</div>
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              style={{
                ...styles.navItem,
                ...(isActive ? styles.navItemActive : {}),
              }}
            >
              <Icon size={18} style={{ opacity: isActive ? 1 : 0.5 }} />
              <span>{item.label}</span>
              {isActive && <div style={styles.activeIndicator} />}
            </NavLink>
          );
        })}
      </nav>

      {/* Connection status */}
      <div style={styles.footer}>
        <div style={styles.connectionStatus}>
          <span
            className={`status-dot ${wsStatus === 'connected' ? 'online' : 'offline'}`}
          />
          <span style={styles.connectionText}>
            {wsStatus === 'connected' ? 'Real-time' : 'Connecting...'}
          </span>
        </div>
        <div style={styles.version}>v1.0.0</div>
      </div>
    </aside>
  );
}

const styles = {
  sidebar: {
    position: 'fixed',
    left: 0,
    top: 0,
    bottom: 0,
    width: 'var(--sidebar-width)',
    background: 'var(--bg-secondary)',
    borderRight: '1px solid var(--border-subtle)',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 100,
    overflow: 'hidden',
  },
  logoArea: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '24px 20px',
    borderBottom: '1px solid var(--border-subtle)',
  },
  logoIcon: {
    width: 42,
    height: 42,
    borderRadius: 'var(--radius-md)',
    background: 'rgba(6, 182, 212, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid rgba(6, 182, 212, 0.2)',
  },
  logoTitle: {
    fontSize: '1.15rem',
    fontWeight: 800,
    color: 'var(--text-primary)',
    lineHeight: 1.2,
    letterSpacing: '-0.02em',
  },
  logoSub: {
    fontSize: '0.72rem',
    fontWeight: 500,
    color: 'var(--accent-cyan)',
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
  },
  nav: {
    flex: 1,
    padding: '20px 12px',
  },
  navLabel: {
    fontSize: '0.65rem',
    fontWeight: 700,
    color: 'var(--text-muted)',
    letterSpacing: '0.1em',
    padding: '0 12px',
    marginBottom: '10px',
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 12px',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-secondary)',
    fontSize: '0.9rem',
    fontWeight: 500,
    textDecoration: 'none',
    transition: 'all 150ms ease',
    position: 'relative',
    marginBottom: '2px',
  },
  navItemActive: {
    background: 'var(--accent-blue-glow)',
    color: 'var(--accent-blue)',
    fontWeight: 600,
  },
  activeIndicator: {
    position: 'absolute',
    right: 0,
    top: '50%',
    transform: 'translateY(-50%)',
    width: 3,
    height: 20,
    background: 'var(--accent-blue)',
    borderRadius: 3,
  },
  footer: {
    padding: '16px 20px',
    borderTop: '1px solid var(--border-subtle)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  connectionStatus: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  connectionText: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
  },
  version: {
    fontSize: '0.7rem',
    color: 'var(--text-muted)',
    fontFamily: 'var(--font-mono)',
  },
};
