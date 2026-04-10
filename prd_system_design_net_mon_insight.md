# 📄 PRODUCT REQUIREMENTS DOCUMENT (PRD)
## NetMon Insight – Network & Server Monitoring System

---

# 1. Objective
Membangun aplikasi web untuk monitoring jaringan dan server secara real-time, dengan kemampuan:
- Observability (visibility menyeluruh)
- Alerting otomatis
- Root cause analysis sederhana

---

# 2. Scope (MVP)

## In Scope
- Monitoring server Linux
- Monitoring jaringan (ping, latency, packet loss)
- Monitoring interface (speed, RX drop)
- Dashboard real-time
- Alerting dasar

## Out of Scope (Phase berikutnya)
- SNMP device monitoring
- Auto network topology
- AI anomaly detection lanjutan

---

# 3. Core Features

## 3.1 Server Monitoring
- CPU usage
- Memory usage
- Disk usage
- Load average

## 3.2 Network Monitoring
- Ping (latency, jitter)
- Packet loss
- Availability

## 3.3 Interface Monitoring
- RX/TX traffic
- RX dropped
- Errors
- Speed & duplex

## 3.4 Alerting
- Threshold-based alert
- Status: OK / WARNING / CRITICAL

## 3.5 Dashboard
- Real-time metrics
- Grafik historis
- Status server

---

# 4. System Design Detail

## 4.1 Architecture Overview

```
[Agent] -> [Backend API] -> [Time-series DB]
                      -> [Frontend Dashboard]
```

---

## 4.2 Component Detail

### A. Agent (Linux)
- Bahasa: Go (recommended)
- Fungsi:
  - Collect metrics setiap 5 detik
  - Command:
    - CPU: /proc/stat
    - RAM: /proc/meminfo
    - Network: ip -s link
    - Speed: ethtool
  - Kirim data via HTTP POST

---

### B. Backend API
- Framework: FastAPI / Node.js
- Fungsi:
  - Ingest metrics
  - Process alert rules
  - Serve API ke frontend

---

### C. Database

#### Option 1 (Recommended):
- InfluxDB (time-series)

#### Option 2:
- PostgreSQL + TimescaleDB

---

### D. Frontend
- React.js
- Realtime via WebSocket
- Chart: Chart.js / Recharts

---

# 5. ERD (Entity Relationship Diagram)

## Entities

### 1. servers
- id (PK)
- hostname
- ip_address
- created_at

### 2. metrics
- id (PK)
- server_id (FK)
- cpu_usage
- memory_usage
- disk_usage
- load_avg
- timestamp

### 3. network_metrics
- id (PK)
- server_id (FK)
- latency
- packet_loss
- jitter
- timestamp

### 4. interface_metrics
- id (PK)
- server_id (FK)
- interface_name
- rx_bytes
- tx_bytes
- rx_dropped
- tx_dropped
- speed
- timestamp

### 5. alerts
- id (PK)
- server_id (FK)
- type
- severity
- message
- created_at

---

# 6. API Specification

## Base URL
```
/api/v1
```

---

## 6.1 Agent → Backend

### POST /metrics

Request:
```json
{
  "hostname": "server1",
  "cpu": 20,
  "memory": 60,
  "disk": 40,
  "interfaces": [
    {
      "name": "enp1s0",
      "rx_bytes": 123456,
      "tx_bytes": 654321,
      "rx_dropped": 100,
      "speed": 1000
    }
  ]
}
```

Response:
```json
{
  "status": "ok"
}
```

---

## 6.2 Frontend APIs

### GET /servers
List semua server

### GET /servers/{id}
Detail server

### GET /metrics/{server_id}
Query metrics historis

Query params:
- from
- to

---

### GET /alerts
List alert

---

# 7. Alert Logic

## Rules

- latency > 50ms → WARNING
- latency > 100ms → CRITICAL
- rx_dropped increase → CRITICAL
- speed < 1000 → WARNING

---

# 8. Non-Functional Requirements

- Realtime (<5s delay)
- High availability
- Secure (API key / token)
- Scalable

---

# 9. Future Enhancements

- SNMP monitoring
- WhatsApp alert
- Auto root cause engine
- Topology mapping

---

# 10. Conclusion

NetMon Insight dirancang untuk:
- Monitoring real-time
- Deteksi bottleneck seperti kasus nyata
- Memberikan insight, bukan hanya data