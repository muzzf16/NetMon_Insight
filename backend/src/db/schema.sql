-- NetMon Insight Database Schema

CREATE TABLE IF NOT EXISTS servers (
  id TEXT PRIMARY KEY,
  hostname TEXT NOT NULL UNIQUE,
  ip_address TEXT,
  os_info TEXT,
  status TEXT DEFAULT 'unknown',
  last_seen DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  server_id TEXT NOT NULL,
  cpu_usage REAL,
  memory_usage REAL,
  disk_usage REAL,
  load_avg REAL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (server_id) REFERENCES servers(id)
);

CREATE TABLE IF NOT EXISTS network_metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  server_id TEXT NOT NULL,
  target_host TEXT,
  latency REAL,
  packet_loss REAL,
  jitter REAL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (server_id) REFERENCES servers(id)
);

CREATE TABLE IF NOT EXISTS interface_metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  server_id TEXT NOT NULL,
  interface_name TEXT NOT NULL,
  rx_bytes INTEGER DEFAULT 0,
  tx_bytes INTEGER DEFAULT 0,
  rx_dropped INTEGER DEFAULT 0,
  tx_dropped INTEGER DEFAULT 0,
  rx_errors INTEGER DEFAULT 0,
  tx_errors INTEGER DEFAULT 0,
  speed INTEGER,
  duplex TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (server_id) REFERENCES servers(id)
);

CREATE TABLE IF NOT EXISTS alerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  server_id TEXT NOT NULL,
  type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK(severity IN ('OK','WARNING','CRITICAL')),
  message TEXT,
  metric_value REAL,
  threshold REAL,
  acknowledged INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (server_id) REFERENCES servers(id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_metrics_server_time ON metrics(server_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_network_metrics_server_time ON network_metrics(server_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_interface_metrics_server_time ON interface_metrics(server_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_alerts_server ON alerts(server_id);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity);
CREATE INDEX IF NOT EXISTS idx_alerts_created ON alerts(created_at);
