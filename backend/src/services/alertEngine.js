/**
 * Alert Engine - Threshold-based alerting system
 * Evaluates incoming metrics against defined rules and generates alerts
 */
const db = require('../db/database');

// Alert threshold rules
const ALERT_RULES = [
  // Network metrics
  { type: 'latency_warning', metric: 'latency', operator: '>', threshold: 50, severity: 'WARNING', message: 'Latency tinggi: {value}ms (threshold: {threshold}ms)' },
  { type: 'latency_critical', metric: 'latency', operator: '>', threshold: 100, severity: 'CRITICAL', message: 'Latency sangat tinggi: {value}ms (threshold: {threshold}ms)' },
  { type: 'packet_loss', metric: 'packet_loss', operator: '>', threshold: 1, severity: 'CRITICAL', message: 'Packet loss terdeteksi: {value}% (threshold: {threshold}%)' },

  // Server metrics
  { type: 'cpu_warning', metric: 'cpu', operator: '>', threshold: 80, severity: 'WARNING', message: 'CPU usage tinggi: {value}% (threshold: {threshold}%)' },
  { type: 'cpu_critical', metric: 'cpu', operator: '>', threshold: 95, severity: 'CRITICAL', message: 'CPU usage kritis: {value}% (threshold: {threshold}%)' },
  { type: 'memory_warning', metric: 'memory', operator: '>', threshold: 85, severity: 'WARNING', message: 'Memory usage tinggi: {value}% (threshold: {threshold}%)' },
  { type: 'memory_critical', metric: 'memory', operator: '>', threshold: 95, severity: 'CRITICAL', message: 'Memory usage kritis: {value}% (threshold: {threshold}%)' },
  { type: 'disk_warning', metric: 'disk', operator: '>', threshold: 85, severity: 'WARNING', message: 'Disk usage tinggi: {value}% (threshold: {threshold}%)' },
  { type: 'disk_critical', metric: 'disk', operator: '>', threshold: 95, severity: 'CRITICAL', message: 'Disk usage kritis: {value}% (threshold: {threshold}%)' },

  // Interface metrics
  { type: 'speed_warning', metric: 'speed', operator: '<', threshold: 1000, severity: 'WARNING', message: 'Link speed hanya {value} Mbps — kemungkinan bottleneck (expected: >= {threshold} Mbps)' },
  { type: 'rx_dropped', metric: 'rx_dropped', operator: '>', threshold: 0, severity: 'CRITICAL', message: 'RX dropped terdeteksi: {value} packets — NIC overload atau buffer penuh' },
];

const insertAlert = db.prepare(`
  INSERT INTO alerts (server_id, type, severity, message, metric_value, threshold)
  VALUES (?, ?, ?, ?, ?, ?)
`);

// Check for recent duplicate alerts (within last 60 seconds)
const recentAlertExists = db.prepare(`
  SELECT COUNT(*) as count FROM alerts
  WHERE server_id = ? AND type = ? AND severity = ?
  AND created_at > datetime('now', '-60 seconds')
`);

function evaluateRule(rule, value) {
  switch (rule.operator) {
    case '>': return value > rule.threshold;
    case '<': return value < rule.threshold;
    case '>=': return value >= rule.threshold;
    case '<=': return value <= rule.threshold;
    case '==': return value === rule.threshold;
    default: return false;
  }
}

function formatMessage(template, value, threshold) {
  return template
    .replace('{value}', typeof value === 'number' ? value.toFixed(1) : value)
    .replace('{threshold}', threshold);
}

/**
 * Process metrics and generate alerts
 * @param {string} serverId
 * @param {object} metrics - { cpu, memory, disk, latency, packet_loss, interfaces }
 * @returns {Array} generated alerts
 */
function processAlerts(serverId, metrics) {
  const generatedAlerts = [];

  // Flatten metrics for evaluation
  const flatMetrics = {
    cpu: metrics.cpu,
    memory: metrics.memory,
    disk: metrics.disk,
    latency: metrics.latency,
    packet_loss: metrics.packet_loss,
  };

  // Evaluate server & network rules
  for (const rule of ALERT_RULES) {
    if (rule.metric === 'speed' || rule.metric === 'rx_dropped') continue; // handled below

    const value = flatMetrics[rule.metric];
    if (value === undefined || value === null) continue;

    if (evaluateRule(rule, value)) {
      // Skip if same alert was generated recently
      const recent = recentAlertExists.get(serverId, rule.type, rule.severity);
      if (recent && recent.count > 0) continue;

      const message = formatMessage(rule.message, value, rule.threshold);
      insertAlert.run(serverId, rule.type, rule.severity, message, value, rule.threshold);
      generatedAlerts.push({ server_id: serverId, type: rule.type, severity: rule.severity, message });
    }
  }

  // Evaluate interface-specific rules
  if (metrics.interfaces && Array.isArray(metrics.interfaces)) {
    for (const iface of metrics.interfaces) {
      // Speed check
      if (iface.speed !== undefined && iface.speed < 1000) {
        const speedRule = ALERT_RULES.find(r => r.type === 'speed_warning');
        const recent = recentAlertExists.get(serverId, 'speed_warning', 'WARNING');
        if (!recent || recent.count === 0) {
          const message = `[${iface.name}] ${formatMessage(speedRule.message, iface.speed, speedRule.threshold)}`;
          insertAlert.run(serverId, 'speed_warning', 'WARNING', message, iface.speed, speedRule.threshold);
          generatedAlerts.push({ server_id: serverId, type: 'speed_warning', severity: 'WARNING', message });
        }
      }

      // RX dropped check (check if increased from previous)
      if (iface.rx_dropped !== undefined && iface.rx_dropped > 0) {
        const dropRule = ALERT_RULES.find(r => r.type === 'rx_dropped');
        const recent = recentAlertExists.get(serverId, 'rx_dropped', 'CRITICAL');
        if (!recent || recent.count === 0) {
          const message = `[${iface.name}] ${formatMessage(dropRule.message, iface.rx_dropped, dropRule.threshold)}`;
          insertAlert.run(serverId, 'rx_dropped', 'CRITICAL', message, iface.rx_dropped, dropRule.threshold);
          generatedAlerts.push({ server_id: serverId, type: 'rx_dropped', severity: 'CRITICAL', message });
        }
      }
    }
  }

  return generatedAlerts;
}

module.exports = { processAlerts, ALERT_RULES };
