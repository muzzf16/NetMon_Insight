# 📡 NetMon Insight Agent (Go)

Production-ready agent for Linux servers. Collects real system metrics and sends to the NetMon Insight backend.

## Features

| Metric | Source | Description |
|--------|--------|-------------|
| CPU Usage | `/proc/stat` | Delta-based CPU utilization percentage |
| Memory Usage | `/proc/meminfo` | MemTotal - MemAvailable |
| Disk Usage | `syscall.Statfs` | Root filesystem usage |
| Load Average | `/proc/loadavg` | 1-minute load average |
| Network RX/TX | `/proc/net/dev` | Bytes, errors, drops per interface |
| Interface Speed | `/sys/class/net/*/speed` | Link speed (Mbps) |
| Interface Duplex | `/sys/class/net/*/duplex` | Full/Half duplex |
| Latency | ICMP Ping | Avg RTT to configured targets |
| Packet Loss | ICMP Ping | Percentage of lost packets |
| Jitter | ICMP Ping | StdDev of RTT |

## Prerequisites

- Go 1.22+ (for building)
- Linux server (target)
- Root access or `CAP_NET_RAW` capability (for ICMP ping)

## Quick Start

### Build

```bash
# For Linux (from Windows/Mac)
make build-linux

# For ARM64 (Raspberry Pi, etc.)
make build-arm

# For current OS
make build
```

### Deploy to Server

```bash
# Copy files to target server
scp netmon-agent config.yaml install.sh deploy/netmon-agent.service user@server:/tmp/netmon/

# On the server, run install script
ssh user@server
cd /tmp/netmon
sudo bash install.sh
```

### Configure

Edit `/etc/netmon-agent/config.yaml`:

```yaml
server:
  url: "http://YOUR_BACKEND_IP:3001/api/v1/metrics"
  api_key: "your-api-key"

interval: 5

ping:
  targets:
    - "192.168.1.1"   # Your gateway
  count: 3

interfaces:
  exclude: ["lo", "docker0", "br-", "veth"]
```

### Start

```bash
# Via systemd (recommended)
sudo systemctl start netmon-agent
sudo systemctl status netmon-agent

# View logs
sudo journalctl -u netmon-agent -f

# Direct run (for testing)
sudo ./netmon-agent -config config.yaml
```

## Docker

```bash
docker build -t netmon-agent .
docker run -d \
  --name netmon-agent \
  --net host \
  --cap-add NET_RAW \
  -v /proc:/host/proc:ro \
  -v /sys:/host/sys:ro \
  -v ./config.yaml:/etc/netmon-agent/config.yaml \
  netmon-agent
```

## Project Structure

```
agent-go/
├── cmd/agent/
│   └── main.go              # Entry point + collection loop
├── internal/
│   ├── collector/
│   │   ├── cpu.go            # /proc/stat reader
│   │   ├── memory.go         # /proc/meminfo reader
│   │   ├── disk.go           # Filesystem + loadavg
│   │   ├── network.go        # /proc/net/dev + sysfs
│   │   └── ping.go           # ICMP ping (go-ping)
│   ├── config/
│   │   └── config.go         # YAML config loader
│   ├── logger/
│   │   └── logger.go         # Leveled logger
│   └── sender/
│       └── sender.go         # HTTP client for backend API
├── deploy/
│   └── netmon-agent.service  # Systemd unit file
├── config.yaml               # Default configuration
├── install.sh                # Install script for servers
├── Makefile                  # Build commands
├── Dockerfile                # Docker deployment
└── go.mod
```

## Security

- Runs as dedicated `netmon` user (no root)
- Only requires `CAP_NET_RAW` (for ICMP ping)
- Systemd `ProtectSystem=strict` for filesystem protection
- API key authentication to backend

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `permission denied` on ping | Run with `sudo` or set `CAP_NET_RAW`: `sudo setcap cap_net_raw=eip ./netmon-agent` |
| `connection refused` to backend | Check backend URL and firewall rules |
| Interface speed shows `-1` | Virtual interfaces don't report speed; this is normal |
| High CPU on agent | Increase `interval` in config.yaml |
