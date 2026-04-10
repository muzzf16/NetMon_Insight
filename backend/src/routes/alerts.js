/**
 * Alerts Route
 * GET /api/v1/alerts - List all alerts
 */
const express = require('express');
const router = express.Router();
const db = require('../db/database');

// GET /api/v1/alerts
router.get('/', (req, res) => {
  try {
    const { severity, server_id, limit, acknowledged } = req.query;

    let query = `
      SELECT a.*, s.hostname, s.ip_address
      FROM alerts a
      JOIN servers s ON a.server_id = s.id
      WHERE 1=1
    `;
    const params = [];

    if (severity) {
      query += ' AND a.severity = ?';
      params.push(severity.toUpperCase());
    }

    if (server_id) {
      query += ' AND a.server_id = ?';
      params.push(server_id);
    }

    if (acknowledged !== undefined) {
      query += ' AND a.acknowledged = ?';
      params.push(acknowledged === 'true' ? 1 : 0);
    }

    query += ' ORDER BY a.created_at DESC';
    query += ` LIMIT ${parseInt(limit) || 50}`;

    const alerts = db.prepare(query).all(...params);

    // Summary counts
    const summary = db.prepare(`
      SELECT
        severity,
        COUNT(*) as count
      FROM alerts
      WHERE acknowledged = 0
      GROUP BY severity
    `).all();

    res.json({ alerts, summary });
  } catch (err) {
    console.error('Error listing alerts:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/v1/alerts/:id/acknowledge
router.patch('/:id/acknowledge', (req, res) => {
  try {
    const result = db.prepare('UPDATE alerts SET acknowledged = 1 WHERE id = ?').run(req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Alert not found' });
    }
    res.json({ status: 'ok' });
  } catch (err) {
    console.error('Error acknowledging alert:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
