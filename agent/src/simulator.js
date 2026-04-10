/**
 * NetMon Insight - Agent Simulator
 * Simulates 3 virtual servers sending metrics every 5 seconds.
 * For development/testing on Windows. Production agent would be Go on Linux.
 */

const API_URL = process.env.API_URL || 'http://localhost:3001/api/v1/metrics';
const INTERVAL = parseInt(process.env.INTERVAL) || 5000;

// Virtual server definitions
const SERVERS = [
  {
    hostname: 'web-server-01',
    ip_address: '192.168.1.10',
    baseCpu: 25, baseMemory: 55, baseDisk: 35,
    interfaces: [
      { name: 'eth0', baseSpeed: 1000, baseDuplex: 'full' },
    ],
  },
  {
    hostname: 'db-server-01',
    ip_address: '192.168.1.20',
    baseCpu: 40, baseMemory: 70, baseDisk: 60,
    interfaces: [
      { name: 'eth0', baseSpeed: 1000, baseDuplex: 'full' },
      { name: 'eth1', baseSpeed: 1000, baseDuplex: 'full' },
    ],
  },
  {
    hostname: 'app-server-01',
    ip_address: '192.168.1.30',
    baseCpu: 35, baseMemory: 50, baseDisk: 45,
    interfaces: [
      { name: 'enp1s0', baseSpeed: 100, baseDuplex: 'half' }, // Intentional bottleneck!
    ],
  },
];

// State tracker for cumulative counters
const state = {};
SERVERS.forEach(s => {
  state[s.hostname] = {
    rxBytes: 0,
    txBytes: 0,
    rxDropped: 0,
    cycle: 0,
  };
});

function randomInRange(base, variance) {
  return Math.max(0, Math.min(100, base + (Math.random() - 0.5) * 2 * variance));
}

function randomSpike(probability, spikeValue, normalValue) {
  return Math.random() < probability ? spikeValue : normalValue;
}

function generateMetrics(server) {
  const s = state[server.hostname];
  s.cycle++;

  // Simulate occasional spikes
  const isSpike = s.cycle % 20 === 0; // Every ~100 seconds
  const cpuSpike = isSpike ? randomInRange(90, 8) : randomInRange(server.baseCpu, 15);
  const memorySpike = isSpike ? randomInRange(92, 5) : randomInRange(server.baseMemory, 10);

  // Accumulate network counters
  const rxRate = Math.floor(Math.random() * 5000000) + 500000; // 0.5-5.5 MB
  const txRate = Math.floor(Math.random() * 3000000) + 200000;
  s.rxBytes += rxRate;
  s.txBytes += txRate;

  // Simulate RX drops for app-server (the bottleneck server)
  let rxDropIncrease = 0;
  if (server.hostname === 'app-server-01') {
    rxDropIncrease = randomSpike(0.3, Math.floor(Math.random() * 500) + 50, 0);
    s.rxDropped += rxDropIncrease;
  }

  // Network latency (app-server has higher latency due to 100Mbps bottleneck)
  let baseLatency = 5;
  if (server.hostname === 'app-server-01') baseLatency = 30;
  const latency = isSpike
    ? randomInRange(baseLatency * 4, 30)
    : randomInRange(baseLatency, 10);

  const packetLoss = randomSpike(0.05, randomInRange(3, 2), randomInRange(0, 0.5));
  const jitter = randomInRange(latency * 0.2, 3);

  return {
    hostname: server.hostname,
    ip_address: server.ip_address,
    cpu: parseFloat(cpuSpike.toFixed(1)),
    memory: parseFloat(memorySpike.toFixed(1)),
    disk: parseFloat(randomInRange(server.baseDisk, 3).toFixed(1)),
    load_avg: parseFloat((cpuSpike / 25).toFixed(2)),
    latency: parseFloat(Math.max(0, latency).toFixed(1)),
    packet_loss: parseFloat(Math.max(0, packetLoss).toFixed(2)),
    jitter: parseFloat(Math.max(0, jitter).toFixed(1)),
    target_host: 'gateway',
    interfaces: server.interfaces.map(iface => ({
      name: iface.name,
      rx_bytes: s.rxBytes,
      tx_bytes: s.txBytes,
      rx_dropped: s.rxDropped,
      tx_dropped: 0,
      rx_errors: server.hostname === 'app-server-01' ? Math.floor(Math.random() * 5) : 0,
      tx_errors: 0,
      speed: iface.baseSpeed,
      duplex: iface.baseDuplex,
    })),
  };
}

async function sendMetrics(server) {
  const metrics = generateMetrics(server);

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(metrics),
    });

    const result = await response.json();
    const statusIcon = result.alerts_generated > 0 ? '🔴' : '🟢';
    const insightIcon = result.insights_count > 0 ? '💡' : '';
    console.log(
      `${statusIcon} [${server.hostname}] CPU: ${metrics.cpu}% | MEM: ${metrics.memory}% | ` +
      `Latency: ${metrics.latency}ms | Alerts: ${result.alerts_generated} ${insightIcon}`
    );
  } catch (err) {
    console.error(`❌ [${server.hostname}] Failed to send: ${err.message}`);
  }
}

async function tick() {
  const promises = SERVERS.map(s => sendMetrics(s));
  await Promise.allSettled(promises);
}

// Main
console.log('');
console.log('╔══════════════════════════════════════════════╗');
console.log('║     📡 NetMon Insight Agent Simulator        ║');
console.log('╠══════════════════════════════════════════════╣');
console.log(`║  🎯 Target:   ${API_URL}`);
console.log(`║  ⏱️  Interval: ${INTERVAL / 1000}s`);
console.log(`║  🖥️  Servers:  ${SERVERS.length}`);
console.log('╠══════════════════════════════════════════════╣');
SERVERS.forEach(s => {
  const bottleneck = s.interfaces.some(i => i.baseSpeed < 1000) ? ' ⚠️  BOTTLENECK' : '';
  console.log(`║  • ${s.hostname} (${s.ip_address})${bottleneck}`);
});
console.log('╚══════════════════════════════════════════════╝');
console.log('');

// Initial send then interval
tick();
setInterval(tick, INTERVAL);
