/**
 * NetMon Insight - Backend Server
 * Entry point: Express + WebSocket
 */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { WebSocketServer } = require('ws');

// Import routes
const metricsRouter = require('./routes/metrics');
const serversRouter = require('./routes/servers');
const alertsRouter = require('./routes/alerts');
const authMiddleware = require('./middleware/auth');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// WebSocket Server
const wss = new WebSocketServer({ server, path: '/ws' });
const clients = new Set();

wss.on('connection', (ws) => {
  clients.add(ws);
  console.log(`🔌 WebSocket client connected (total: ${clients.size})`);

  ws.on('close', () => {
    clients.delete(ws);
    console.log(`🔌 WebSocket client disconnected (total: ${clients.size})`);
  });

  ws.on('error', (err) => {
    console.error('WebSocket error:', err.message);
    clients.delete(ws);
  });
});

// Broadcast function available to routes
function broadcast(message) {
  for (const client of clients) {
    if (client.readyState === 1) { // OPEN
      try {
        client.send(message);
      } catch (e) {
        clients.delete(client);
      }
    }
  }
}
app.set('wsBroadcast', broadcast);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/v1/metrics', authMiddleware, metricsRouter);
app.use('/api/v1/servers', serversRouter);
app.use('/api/v1/alerts', alertsRouter);

// Insights endpoint
const { analyzeInsights } = require('./services/insightEngine');
const db = require('./db/database');

app.get('/api/v1/insights/:server_id', (req, res) => {
  try {
    const serverId = req.params.server_id;

    const latestMetric = db.prepare(
      'SELECT * FROM metrics WHERE server_id = ? ORDER BY timestamp DESC LIMIT 1'
    ).get(serverId);

    const latestNetwork = db.prepare(
      'SELECT * FROM network_metrics WHERE server_id = ? ORDER BY timestamp DESC LIMIT 1'
    ).get(serverId);

    const latestInterfaces = db.prepare(`
      SELECT * FROM interface_metrics WHERE server_id = ?
      AND timestamp = (SELECT MAX(timestamp) FROM interface_metrics WHERE server_id = ?)
    `).all(serverId, serverId);

    if (!latestMetric) {
      return res.json({ insights: [] });
    }

    const data = {
      cpu: latestMetric.cpu_usage,
      memory: latestMetric.memory_usage,
      disk: latestMetric.disk_usage,
      latency: latestNetwork?.latency || 0,
      packet_loss: latestNetwork?.packet_loss || 0,
      interfaces: latestInterfaces.map(i => ({
        name: i.interface_name,
        rx_dropped: i.rx_dropped,
        rx_errors: i.rx_errors,
        speed: i.speed,
      })),
    };

    const insights = analyzeInsights(data);
    res.json({ insights });
  } catch (err) {
    console.error('Error generating insights:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start server
server.listen(PORT, () => {
  console.log('');
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║       🖥️  NetMon Insight Backend API         ║');
  console.log('╠══════════════════════════════════════════════╣');
  console.log(`║  🌐 HTTP:  http://localhost:${PORT}             ║`);
  console.log(`║  🔌 WS:    ws://localhost:${PORT}/ws             ║`);
  console.log(`║  📊 Mode:  ${process.env.NODE_ENV || 'development'}                  ║`);
  console.log('╚══════════════════════════════════════════════╝');
  console.log('');
});
