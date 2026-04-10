/**
 * Metrics Route - Agent data ingestion
 * POST /api/v1/metrics
 */
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const { processAlerts } = require('../services/alertEngine');
const { analyzeInsights } = require('../services/insightEngine');

// Prepared statements for performance
const upsertServer = db.prepare(`
  INSERT INTO servers (id, hostname, ip_address, status, last_seen)
  VALUES (?, ?, ?, 'online', datetime('now'))
  ON CONFLICT(hostname) DO UPDATE SET
    ip_address = excluded.ip_address,
    status = 'online',
    last_seen = datetime('now')
`);

const getServerByHostname = db.prepare('SELECT id FROM servers WHERE hostname = ?');

const insertMetric = db.prepare(`
  INSERT INTO metrics (server_id, cpu_usage, memory_usage, disk_usage, load_avg, timestamp)
  VALUES (?, ?, ?, ?, ?, datetime('now'))
`);

const insertNetworkMetric = db.prepare(`
  INSERT INTO network_metrics (server_id, target_host, latency, packet_loss, jitter, timestamp)
  VALUES (?, ?, ?, ?, ?, datetime('now'))
`);

const insertInterfaceMetric = db.prepare(`
  INSERT INTO interface_metrics (server_id, interface_name, rx_bytes, tx_bytes, rx_dropped, tx_dropped, rx_errors, tx_errors, speed, duplex, timestamp)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
`);

// POST /api/v1/metrics - Ingest metrics from agent
router.post('/', (req, res) => {
  try {
    const data = req.body;

    if (!data.hostname) {
      return res.status(400).json({ error: 'hostname is required' });
    }

    // Upsert server
    let server = getServerByHostname.get(data.hostname);
    let serverId;

    if (!server) {
      serverId = uuidv4();
      upsertServer.run(serverId, data.hostname, data.ip_address || null);
    } else {
      serverId = server.id;
      upsertServer.run(serverId, data.hostname, data.ip_address || null);
    }

    // Insert server metrics
    insertMetric.run(
      serverId,
      data.cpu ?? null,
      data.memory ?? null,
      data.disk ?? null,
      data.load_avg ?? null
    );

    // Insert network metrics
    if (data.latency !== undefined || data.packet_loss !== undefined) {
      insertNetworkMetric.run(
        serverId,
        data.target_host || 'gateway',
        data.latency ?? null,
        data.packet_loss ?? null,
        data.jitter ?? null
      );
    }

    // Insert interface metrics
    if (data.interfaces && Array.isArray(data.interfaces)) {
      for (const iface of data.interfaces) {
        insertInterfaceMetric.run(
          serverId,
          iface.name || 'unknown',
          iface.rx_bytes ?? 0,
          iface.tx_bytes ?? 0,
          iface.rx_dropped ?? 0,
          iface.tx_dropped ?? 0,
          iface.rx_errors ?? 0,
          iface.tx_errors ?? 0,
          iface.speed ?? null,
          iface.duplex ?? null
        );
      }
    }

    // Process alerts
    const alerts = processAlerts(serverId, data);

    // Generate insights
    const insights = analyzeInsights(data);

    // Broadcast via WebSocket
    const broadcast = req.app.get('wsBroadcast');
    if (broadcast) {
      broadcast(JSON.stringify({
        type: 'metrics_update',
        server_id: serverId,
        hostname: data.hostname,
        data: {
          cpu: data.cpu,
          memory: data.memory,
          disk: data.disk,
          latency: data.latency,
          packet_loss: data.packet_loss,
          timestamp: new Date().toISOString(),
        },
        alerts,
        insights,
      }));
    }

    res.json({ status: 'ok', alerts_generated: alerts.length, insights_count: insights.length });
  } catch (err) {
    console.error('Error ingesting metrics:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
