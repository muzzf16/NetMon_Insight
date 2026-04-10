/**
 * Servers Route
 * GET /api/v1/servers - List all servers
 * GET /api/v1/servers/:id - Server detail
 * GET /api/v1/metrics/:server_id - Historical metrics
 */
const express = require('express');
const router = express.Router();
const db = require('../db/database');

// GET /api/v1/servers - List all servers with latest metrics
router.get('/', (req, res) => {
  try {
    const servers = db.prepare(`
      SELECT
        s.*,
        m.cpu_usage, m.memory_usage, m.disk_usage, m.load_avg,
        m.timestamp as last_metric_time,
        nm.latency, nm.packet_loss, nm.jitter
      FROM servers s
      LEFT JOIN metrics m ON m.id = (
        SELECT id FROM metrics WHERE server_id = s.id ORDER BY timestamp DESC LIMIT 1
      )
      LEFT JOIN network_metrics nm ON nm.id = (
        SELECT id FROM network_metrics WHERE server_id = s.id ORDER BY timestamp DESC LIMIT 1
      )
      ORDER BY s.hostname
    `).all();

    // Determine effective status based on last_seen
    const enrichedServers = servers.map(s => {
      const lastSeen = s.last_seen ? new Date(s.last_seen + 'Z') : null;
      const now = new Date();
      const diffSec = lastSeen ? (now - lastSeen) / 1000 : Infinity;

      let status = 'offline';
      if (diffSec < 30) status = 'online';
      else if (diffSec < 120) status = 'warning';

      // Check latest alert severity
      const latestAlert = db.prepare(`
        SELECT severity FROM alerts WHERE server_id = ? ORDER BY created_at DESC LIMIT 1
      `).get(s.id);

      if (latestAlert && latestAlert.severity === 'CRITICAL' && status === 'online') {
        status = 'critical';
      }

      return { ...s, status, alert_count: getAlertCount(s.id) };
    });

    res.json(enrichedServers);
  } catch (err) {
    console.error('Error listing servers:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/v1/servers/:id - Server detail with recent metrics
router.get('/:id', (req, res) => {
  try {
    const server = db.prepare('SELECT * FROM servers WHERE id = ?').get(req.params.id);
    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }

    // Latest metrics
    const latestMetric = db.prepare(`
      SELECT * FROM metrics WHERE server_id = ? ORDER BY timestamp DESC LIMIT 1
    `).get(req.params.id);

    const latestNetwork = db.prepare(`
      SELECT * FROM network_metrics WHERE server_id = ? ORDER BY timestamp DESC LIMIT 1
    `).get(req.params.id);

    const latestInterfaces = db.prepare(`
      SELECT * FROM interface_metrics WHERE server_id = ?
      AND timestamp = (SELECT MAX(timestamp) FROM interface_metrics WHERE server_id = ?)
    `).all(req.params.id, req.params.id);

    // Recent alerts
    const recentAlerts = db.prepare(`
      SELECT * FROM alerts WHERE server_id = ? ORDER BY created_at DESC LIMIT 20
    `).all(req.params.id);

    res.json({
      server,
      latest_metric: latestMetric || null,
      latest_network: latestNetwork || null,
      latest_interfaces: latestInterfaces,
      recent_alerts: recentAlerts,
    });
  } catch (err) {
    console.error('Error getting server detail:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/v1/metrics/:server_id - Historical metrics
router.get('/metrics/:server_id', (req, res) => {
  try {
    const { from, to, limit } = req.query;
    const serverId = req.params.server_id;

    let query = 'SELECT * FROM metrics WHERE server_id = ?';
    const params = [serverId];

    if (from) {
      query += ' AND timestamp >= ?';
      params.push(from);
    }
    if (to) {
      query += ' AND timestamp <= ?';
      params.push(to);
    }

    query += ' ORDER BY timestamp DESC';
    query += ` LIMIT ${parseInt(limit) || 100}`;

    const metrics = db.prepare(query).all(...params);

    // Also get network metrics
    let netQuery = 'SELECT * FROM network_metrics WHERE server_id = ?';
    const netParams = [serverId];
    if (from) { netQuery += ' AND timestamp >= ?'; netParams.push(from); }
    if (to) { netQuery += ' AND timestamp <= ?'; netParams.push(to); }
    netQuery += ' ORDER BY timestamp DESC';
    netQuery += ` LIMIT ${parseInt(limit) || 100}`;

    const networkMetrics = db.prepare(netQuery).all(...netParams);

    // Interface metrics
    let ifaceQuery = 'SELECT * FROM interface_metrics WHERE server_id = ?';
    const ifaceParams = [serverId];
    if (from) { ifaceQuery += ' AND timestamp >= ?'; ifaceParams.push(from); }
    if (to) { ifaceQuery += ' AND timestamp <= ?'; ifaceParams.push(to); }
    ifaceQuery += ' ORDER BY timestamp DESC';
    ifaceQuery += ` LIMIT ${parseInt(limit) || 200}`;

    const interfaceMetrics = db.prepare(ifaceQuery).all(...ifaceParams);

    res.json({ metrics, network_metrics: networkMetrics, interface_metrics: interfaceMetrics });
  } catch (err) {
    console.error('Error getting historical metrics:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

function getAlertCount(serverId) {
  const result = db.prepare(`
    SELECT COUNT(*) as count FROM alerts
    WHERE server_id = ? AND acknowledged = 0
  `).get(serverId);
  return result ? result.count : 0;
}

module.exports = router;
