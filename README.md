# 🖥️ NetMon Insight

**Network & Server Monitoring System with Smart Root Cause Analysis**

NetMon Insight adalah aplikasi web monitoring jaringan dan server secara real-time, dengan kemampuan observability, alerting otomatis, dan root cause analysis.

> 💡 **Key Differentiator**: Bukan sekadar monitoring — NetMon Insight memberikan **Smart Insights** yang menganalisis korelasi antar metrik untuk menemukan root cause, seperti: *"Latency tinggi tapi CPU rendah → kemungkinan network issue"*

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+ (download: https://nodejs.org)

### 1. Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Start Backend API

```bash
cd backend
npm run dev
```

Backend akan berjalan di `http://localhost:3001`

### 3. Start Frontend Dashboard

```bash
cd frontend
npm run dev
```

Dashboard akan berjalan di `http://localhost:5173`

### 4. Start Agent Simulator

```bash
cd agent
node src/simulator.js
```

Agent akan mengirim data dari 3 virtual server setiap 5 detik.

---

## 📁 Project Structure

```
NetMon_Insight/
├── backend/              # Express API + WebSocket + SQLite
│   ├── src/
│   │   ├── index.js      # Server entry point
│   │   ├── db/           # Database schema & connection
│   │   ├── routes/       # API endpoints
│   │   ├── services/     # Alert engine + Smart Insight engine
│   │   └── middleware/    # Auth middleware
│   └── data/             # SQLite database (auto-created)
│
├── frontend/             # React (Vite) Dashboard
│   ├── src/
│   │   ├── components/   # Reusable UI components
│   │   ├── pages/        # Dashboard, ServerDetail, Alerts
│   │   └── services/     # API client + WebSocket client
│   └── index.html
│
└── agent/                # Agent Simulator (dev/testing)
    └── src/simulator.js  # Simulates 3 servers with bottleneck scenarios
```

---

## 🧩 Architecture

```
[Agent Simulator] → POST /api/v1/metrics → [Backend API] → [SQLite DB]
                                                ↓ WebSocket
                                          [React Dashboard]
```

---

## 📊 Features (MVP)

| Feature | Description |
|---------|-------------|
| 🖥️ Server Monitoring | CPU, Memory, Disk, Load Average |
| 🌐 Network Monitoring | Latency, Packet Loss, Jitter |
| 🔌 Interface Monitoring | RX/TX, RX Dropped, Speed, Duplex |
| 🔔 Alerting | Threshold-based (WARNING/CRITICAL) |
| 🧠 Smart Insights | Root cause analysis & suggestions |
| 📈 Historical Charts | Time-series graphs via Recharts |
| ⚡ Real-time | WebSocket live updates (<5s delay) |

---

## 🔔 Alert Rules

| Condition | Level |
|-----------|-------|
| Latency > 50ms | ⚠️ WARNING |
| Latency > 100ms | 🔴 CRITICAL |
| Packet Loss > 1% | 🔴 CRITICAL |
| CPU > 80% | ⚠️ WARNING |
| CPU > 95% | 🔴 CRITICAL |
| Memory > 85% | ⚠️ WARNING |
| Memory > 95% | 🔴 CRITICAL |
| RX Dropped > 0 | 🔴 CRITICAL |
| Link Speed < 1000 Mbps | ⚠️ WARNING |

---

## 🧠 Smart Insight Examples

- *"Latency tinggi tapi CPU rendah → kemungkinan network issue"*
- *"Link speed hanya 100 Mbps → bottleneck interface"*
- *"RX dropped tinggi → NIC overload atau buffer penuh"*
- *"CPU dan Memory tinggi bersamaan → server overloaded"*

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js + Express |
| Database | SQLite (better-sqlite3) |
| Frontend | React 19 + Vite |
| Charts | Recharts |
| Icons | Lucide React |
| Real-time | WebSocket (ws) |
| Agent | Node.js Simulator |

---

## 🐳 Deployment (Tahap Production)

Untuk menjalankan seluruh stack menggunakan Docker Compose:

```bash
docker-compose up -d --build
```
- Backend (API & WS) berjalan di port `3001`
- Frontend Dashboard berjalan di port `80` (Akses `http://localhost`)

---

## 🚀 Menjalankan Agent (Go) di Linux

Bila Anda memiliki server target Linux sungguhan, gunakan **Agent Go** asli untuk menarik matrik riil dari `/proc/stat`, `/proc/meminfo`, dan `/proc/net/dev`.

### Build Agent

**Bila Anda menggunakan Linux/Mac (Bash):**
```bash
cd agent-go
CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o netmon-agent main.go
```

**Bila Anda menggunakan Windows (PowerShell):**
```powershell
cd agent-go
$env:CGO_ENABLED="0"; $env:GOOS="linux"; $env:GOARCH="amd64"; go build -o netmon-agent main.go
```

### Konfigurasi
Edit `agent-go/config.yaml`:
```yaml
server:
  url: "http://<IP_SERVER_ANDA>:3001/api/v1/metrics"
  api_key: "netmon-dev-key"
```

### Jalankan Agent
```bash
./netmon-agent config.yaml
```

*(Untuk environment testing di Windows, Anda masih bisa menggunakan Agent Simulator di dalam folder `agent/`)*

---

## 🛣️ Roadmap

- [x] Phase 1: MVP Backend, Frontend, Agent Simulator
- [x] Phase 1.5: Dockerization & Real Go Agent
- [ ] Phase 2: WhatsApp alert, SNMP support
- [ ] Phase 3: AI anomaly detection, PostgreSQL/TimescaleDB migration

---

## 📝 License

MIT
