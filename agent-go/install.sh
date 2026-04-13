#!/bin/bash
# ═══════════════════════════════════════════════════
# NetMon Insight Agent — Install Script
# Run as root on target Linux server
# ═══════════════════════════════════════════════════

set -e

BINARY_NAME="netmon-agent"
INSTALL_DIR="/usr/local/bin"
CONFIG_DIR="/etc/netmon-agent"
LOG_DIR="/var/log/netmon"
SERVICE_FILE="/etc/systemd/system/netmon-agent.service"
SERVICE_USER="netmon"

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║  📡 NetMon Insight Agent Installer               ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""

# Check root
if [ "$(id -u)" -ne 0 ]; then
    echo "❌ This script must be run as root"
    exit 1
fi

# Check binary exists
if [ ! -f "./${BINARY_NAME}" ]; then
    echo "❌ Binary '${BINARY_NAME}' not found in current directory"
    echo "   Build it first: make build-linux"
    exit 1
fi

# Create service user (no login shell)
if ! id "${SERVICE_USER}" &>/dev/null; then
    echo "📝 Creating user '${SERVICE_USER}'..."
    useradd --system --no-create-home --shell /usr/sbin/nologin "${SERVICE_USER}"
fi

# Install binary
echo "📦 Installing binary to ${INSTALL_DIR}..."
cp "./${BINARY_NAME}" "${INSTALL_DIR}/${BINARY_NAME}"
chmod 755 "${INSTALL_DIR}/${BINARY_NAME}"

# Grant NET_RAW capability for ICMP ping
echo "🔐 Setting capabilities (CAP_NET_RAW)..."
setcap cap_net_raw=eip "${INSTALL_DIR}/${BINARY_NAME}"

# Create config directory
echo "📁 Setting up config..."
mkdir -p "${CONFIG_DIR}"
if [ ! -f "${CONFIG_DIR}/config.yaml" ]; then
    cp config.yaml "${CONFIG_DIR}/config.yaml"
    echo "   ✅ Config copied to ${CONFIG_DIR}/config.yaml"
    echo "   ⚠️  EDIT the config file with your backend URL and ping targets!"
else
    echo "   ⏩ Config already exists, skipping (backup: config.yaml.new)"
    cp config.yaml "${CONFIG_DIR}/config.yaml.new"
fi
chown -R "${SERVICE_USER}:${SERVICE_USER}" "${CONFIG_DIR}"

# Create log directory
echo "📁 Creating log directory..."
mkdir -p "${LOG_DIR}"
chown -R "${SERVICE_USER}:${SERVICE_USER}" "${LOG_DIR}"

# Install systemd service
echo "🔧 Installing systemd service..."
cp deploy/netmon-agent.service "${SERVICE_FILE}"
systemctl daemon-reload
systemctl enable netmon-agent

echo ""
echo "✅ Installation complete!"
echo ""
echo "Next steps:"
echo "  1. Edit config: sudo nano ${CONFIG_DIR}/config.yaml"
echo "     - Set 'server.url' to your NetMon Insight backend"
echo "     - Set ping targets (your gateway IP)"
echo "  2. Start the agent: sudo systemctl start netmon-agent"
echo "  3. Check status: sudo systemctl status netmon-agent"
echo "  4. View logs: sudo journalctl -u netmon-agent -f"
echo ""
