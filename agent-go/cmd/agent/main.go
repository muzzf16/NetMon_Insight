package main

import (
	"flag"
	"fmt"
	"net"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/muzzf16/netmon-agent/internal/collector"
	"github.com/muzzf16/netmon-agent/internal/config"
	"github.com/muzzf16/netmon-agent/internal/logger"
	"github.com/muzzf16/netmon-agent/internal/sender"
)

var (
	version   = "1.0.0"
	buildTime = "dev"
)

func main() {
	configPath := flag.String("config", "config.yaml", "Path to configuration file")
	showVersion := flag.Bool("version", false, "Show version and exit")
	flag.Parse()

	if *showVersion {
		fmt.Printf("NetMon Insight Agent v%s (built: %s)\n", version, buildTime)
		os.Exit(0)
	}

	// Load configuration
	cfg, err := config.Load(*configPath)
	if err != nil {
		fmt.Fprintf(os.Stderr, "❌ Failed to load config: %v\n", err)
		os.Exit(1)
	}

	// Initialize logger
	log := logger.New(cfg.Log.Level, cfg.Log.File)

	// Print banner
	printBanner(cfg, log)

	// Initialize sender
	s := sender.New(cfg.Server.URL, cfg.Server.APIKey, cfg.Server.Timeout)

	// Detect primary IP
	primaryIP := detectPrimaryIP()
	log.Info("Detected primary IP: %s", primaryIP)

	// Initial CPU read to prime the delta calculation
	collector.CollectCPU()
	time.Sleep(100 * time.Millisecond)

	// Graceful shutdown
	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)

	ticker := time.NewTicker(time.Duration(cfg.Interval) * time.Second)
	defer ticker.Stop()

	log.Info("Starting metric collection (every %ds)...", cfg.Interval)
	fmt.Println()

	// Collect immediately on start
	collectAndSend(cfg, s, log, primaryIP)

	for {
		select {
		case <-ticker.C:
			collectAndSend(cfg, s, log, primaryIP)
		case sig := <-sigCh:
			log.Info("Received signal %v, shutting down...", sig)
			fmt.Println("\n👋 Agent stopped gracefully.")
			os.Exit(0)
		}
	}
}

func collectAndSend(cfg *config.Config, s *sender.Sender, log *logger.Logger, primaryIP string) {
	// ── Collect CPU ──
	cpuStats, err := collector.CollectCPU()
	if err != nil {
		log.Error("CPU collection failed: %v", err)
		return
	}
	log.Debug("CPU: %.1f%%", cpuStats.UsagePercent)

	// ── Collect Memory ──
	memStats, err := collector.CollectMemory()
	if err != nil {
		log.Error("Memory collection failed: %v", err)
		return
	}
	log.Debug("Memory: %.1f%%", memStats.UsagePercent)

	// ── Collect Disk ──
	diskStats, err := collector.CollectDisk()
	if err != nil {
		log.Error("Disk collection failed: %v", err)
		return
	}
	log.Debug("Disk: %.1f%% (%s)", diskStats.UsagePercent, diskStats.MountPoint)

	// ── Collect Load Average ──
	loadAvg, err := collector.CollectLoadAvg()
	if err != nil {
		log.Warn("Load average collection failed: %v", err)
		loadAvg = 0
	}

	// ── Collect Network Interfaces ──
	interfaces, err := collector.CollectInterfaces(
		cfg.Interfaces.Include,
		cfg.Interfaces.Exclude,
	)
	if err != nil {
		log.Error("Interface collection failed: %v", err)
		return
	}

	ifaceData := make([]sender.InterfaceData, len(interfaces))
	for i, iface := range interfaces {
		ifaceData[i] = sender.InterfaceData{
			Name:      iface.Name,
			RxBytes:   iface.RxBytes,
			TxBytes:   iface.TxBytes,
			RxDropped: iface.RxDropped,
			TxDropped: iface.TxDropped,
			RxErrors:  iface.RxErrors,
			TxErrors:  iface.TxErrors,
			Speed:     iface.Speed,
			Duplex:    iface.Duplex,
		}
		log.Debug("  Interface %s: speed=%d rx_drop=%d", iface.Name, iface.Speed, iface.RxDropped)
	}

	// ── Build payload ──
	payload := &sender.MetricsPayload{
		Hostname:   cfg.Hostname,
		IPAddress:  primaryIP,
		CPU:        cpuStats.UsagePercent,
		Memory:     memStats.UsagePercent,
		Disk:       diskStats.UsagePercent,
		LoadAvg:    loadAvg,
		Interfaces: ifaceData,
	}

	// ── Collect Ping (if targets configured) ──
	if len(cfg.Ping.Targets) > 0 {
		target := cfg.Ping.Targets[0] // Use first target for primary metrics
		pingResult, err := collector.CollectPing(target, cfg.Ping.Count, cfg.Ping.Timeout)
		if err != nil {
			log.Warn("Ping to %s failed: %v", target, err)
		} else {
			payload.Latency = &pingResult.Latency
			payload.PacketLoss = &pingResult.PacketLoss
			payload.Jitter = &pingResult.Jitter
			payload.TargetHost = target
			log.Debug("Ping %s: latency=%.1fms loss=%.1f%%", target, pingResult.Latency, pingResult.PacketLoss)
		}
	}

	// ── Send to backend ──
	resp, err := s.Send(payload)
	if err != nil {
		log.Error("Failed to send metrics: %v", err)
		return
	}

	// Status icon
	icon := "🟢"
	if resp.AlertsGenerated > 0 {
		icon = "🔴"
	}
	insightIcon := ""
	if resp.InsightsCount > 0 {
		insightIcon = " 💡"
	}

	latencyStr := "N/A"
	if payload.Latency != nil {
		latencyStr = fmt.Sprintf("%.1fms", *payload.Latency)
	}

	log.Info("%s CPU: %.1f%% | MEM: %.1f%% | DISK: %.1f%% | Latency: %s | Alerts: %d%s",
		icon, cpuStats.UsagePercent, memStats.UsagePercent, diskStats.UsagePercent,
		latencyStr, resp.AlertsGenerated, insightIcon)
}

func detectPrimaryIP() string {
	conn, err := net.Dial("udp", "8.8.8.8:80")
	if err != nil {
		// Fallback: try to find any non-loopback IP
		addrs, err := net.InterfaceAddrs()
		if err != nil {
			return "unknown"
		}
		for _, addr := range addrs {
			if ipnet, ok := addr.(*net.IPNet); ok && !ipnet.IP.IsLoopback() {
				if ipnet.IP.To4() != nil {
					return ipnet.IP.String()
				}
			}
		}
		return "unknown"
	}
	defer conn.Close()

	localAddr := conn.LocalAddr().(*net.UDPAddr)
	return localAddr.IP.String()
}

func printBanner(cfg *config.Config, log *logger.Logger) {
	ifaces := strings.Join(cfg.Interfaces.Exclude, ", ")
	targets := strings.Join(cfg.Ping.Targets, ", ")

	fmt.Println()
	fmt.Println("╔══════════════════════════════════════════════════╗")
	fmt.Println("║     📡  NetMon Insight Agent (Go) v" + version + "        ║")
	fmt.Println("╠══════════════════════════════════════════════════╣")
	fmt.Printf("║  🖥️  Host:     %s\n", cfg.Hostname)
	fmt.Printf("║  🎯  Target:   %s\n", cfg.Server.URL)
	fmt.Printf("║  ⏱️   Interval: %ds\n", cfg.Interval)
	fmt.Printf("║  🏓  Ping:     %s\n", targets)
	fmt.Printf("║  🚫  Exclude:  %s\n", ifaces)
	fmt.Println("╚══════════════════════════════════════════════════╝")
	fmt.Println()
}
