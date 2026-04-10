/**
 * Smart Insight Engine
 * Provides root cause analysis suggestions based on correlated metrics.
 * This is the key differentiator — not just monitoring, but insight.
 */

/**
 * Analyze metrics and generate smart insights
 * @param {object} data - { cpu, memory, disk, latency, packet_loss, interfaces }
 * @returns {Array} insights
 */
function analyzeInsights(data) {
  const insights = [];

  // Insight 1: Latency tinggi tapi CPU rendah → kemungkinan network issue
  if (data.latency > 50 && data.cpu < 50) {
    insights.push({
      level: 'warning',
      category: 'network',
      title: 'Network Bottleneck Detected',
      message: `Latency tinggi (${data.latency.toFixed(1)}ms) tapi CPU rendah (${data.cpu.toFixed(1)}%). Kemungkinan besar masalah ada di jaringan, bukan di server.`,
      suggestion: 'Periksa switch, kabel, atau jalur routing antara client dan server.',
    });
  }

  // Insight 2: Latency tinggi + CPU tinggi → server overloaded
  if (data.latency > 50 && data.cpu > 80) {
    insights.push({
      level: 'critical',
      category: 'server',
      title: 'Server Overloaded',
      message: `Latency tinggi (${data.latency.toFixed(1)}ms) dan CPU tinggi (${data.cpu.toFixed(1)}%). Server kemungkinan tidak mampu menangani beban saat ini.`,
      suggestion: 'Periksa proses yang menggunakan CPU tinggi. Pertimbangkan scaling atau optimasi aplikasi.',
    });
  }

  // Insight 3: Link speed 100 Mbps → bottleneck interface
  if (data.interfaces && Array.isArray(data.interfaces)) {
    for (const iface of data.interfaces) {
      if (iface.speed && iface.speed < 1000) {
        insights.push({
          level: 'warning',
          category: 'interface',
          title: `Interface ${iface.name}: Link Speed Bottleneck`,
          message: `Link speed hanya ${iface.speed} Mbps. Untuk server, ini bisa menjadi bottleneck signifikan.`,
          suggestion: 'Periksa kabel (pastikan Cat5e/Cat6), port switch, dan konfigurasi auto-negotiation. Kemungkinan kabel rusak atau switch port hanya support 100 Mbps.',
        });
      }

      // Insight 4: RX dropped tinggi → NIC overload
      if (iface.rx_dropped && iface.rx_dropped > 100) {
        insights.push({
          level: 'critical',
          category: 'interface',
          title: `Interface ${iface.name}: RX Drop Tinggi`,
          message: `RX dropped: ${iface.rx_dropped} packets. NIC kemungkinan overload atau buffer penuh.`,
          suggestion: 'Periksa ring buffer NIC (ethtool -g), coba tingkatkan dengan ethtool -G. Juga periksa apakah ada traffic storm atau broadcast storm di network.',
        });
      }

      // Insight 5: RX errors tinggi
      if (iface.rx_errors && iface.rx_errors > 0) {
        insights.push({
          level: 'warning',
          category: 'interface',
          title: `Interface ${iface.name}: RX Errors Detected`,
          message: `RX errors terdeteksi: ${iface.rx_errors}. Bisa indikasi masalah physical layer.`,
          suggestion: 'Periksa kabel jaringan, konektor RJ45, dan port switch. Ganti kabel jika perlu.',
        });
      }
    }
  }

  // Insight 6: High memory + high disk → resource exhaustion
  if (data.memory > 90 && data.disk > 85) {
    insights.push({
      level: 'critical',
      category: 'server',
      title: 'Resource Exhaustion Risk',
      message: `Memory (${data.memory.toFixed(1)}%) dan Disk (${data.disk.toFixed(1)}%) hampir penuh. Server berisiko crash atau hang.`,
      suggestion: 'Segera free up disk space dan identifikasi proses yang memakan memory berlebihan. Pertimbangkan restart managed services.',
    });
  }

  // Insight 7: Packet loss detected
  if (data.packet_loss > 1) {
    insights.push({
      level: 'critical',
      category: 'network',
      title: 'Packet Loss Signifikan',
      message: `Packet loss ${data.packet_loss.toFixed(1)}%. Koneksi tidak stabil.`,
      suggestion: 'Periksa kualitas link, congestion di switch/router, atau interference (jika wireless). Cek juga apakah ada QoS issue.',
    });
  }

  return insights;
}

module.exports = { analyzeInsights };
