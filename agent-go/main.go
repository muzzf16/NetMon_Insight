package main

import (
	"log"
	"os"
	"time"

	"github.com/muzzf16/netmon-agent/internal/client"
	"github.com/muzzf16/netmon-agent/internal/collector"
	"github.com/muzzf16/netmon-agent/internal/config"
)

type Payload struct {
	Hostname   string                     `json:"hostname"`
	IPAddress  string                     `json:"ip_address,omitempty"`
	CPU        float64                    `json:"cpu"`
	Memory     float64                    `json:"memory"`
	Disk       float64                    `json:"disk"`
	LoadAvg    float64                    `json:"load_avg"`
	Latency    *float64                   `json:"latency,omitempty"`
	PacketLoss *float64                   `json:"packet_loss,omitempty"`
	Jitter     *float64                   `json:"jitter,omitempty"`
	Interfaces []collector.InterfaceStats `json:"interfaces"`
}

func main() {
	cfgPath := "config.yaml"
	if len(os.Args) > 1 {
		cfgPath = os.Args[1]
	}

	cfg, err := config.Load(cfgPath)
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	api := client.NewAPIClient(cfg.Server)

	log.Printf("Starting NetMon Agent for host %s", cfg.Hostname)
	log.Printf("Target API: %s (Interval: %ds)", cfg.Server.URL, cfg.Interval)

	ticker := time.NewTicker(time.Duration(cfg.Interval) * time.Second)
	defer ticker.Stop()

	for range ticker.C {
		payload := generatePayload(cfg)
		log.Printf("Sending metrics (CPU: %.1f%%, RAM: %.1f%%)", payload.CPU, payload.Memory)

		err := api.SendMetrics(payload)
		if err != nil {
			log.Printf("Error sending metrics: %v", err)
		} else {
			log.Printf("Metrics successfully sent")
		}
	}
}

func generatePayload(cfg *config.Config) Payload {
	pl := Payload{
		Hostname: cfg.Hostname,
	}

	// CPU
	if cpuStat, err := collector.CollectCPU(); err == nil {
		pl.CPU = cpuStat.UsagePercent
	}

	// Memory
	if memStat, err := collector.CollectMemory(); err == nil {
		pl.Memory = memStat.UsagePercent
	}

	// Disk
	if diskStat, err := collector.CollectDisk(); err == nil {
		pl.Disk = diskStat.UsagePercent
	}

	// Network
	if len(cfg.Ping.Targets) > 0 {
		target := cfg.Ping.Targets[0]
		if netStat, err := collector.CollectNetwork(target, cfg.Ping.Count, cfg.Ping.Timeout); err == nil {
			pl.Latency = &netStat.Latency
			pl.PacketLoss = &netStat.PacketLoss
			pl.Jitter = &netStat.Jitter
		} else {
			log.Printf("Ping warning for %s: %v", target, err)
		}
	}

	// Interfaces
	if ifaces, err := collector.CollectInterfaces(cfg.Interfaces.Include, cfg.Interfaces.Exclude); err == nil {
		pl.Interfaces = ifaces
	} else {
		log.Printf("Interface warning: %v", err)
	}

	// Load Average (simulate or read from /proc/loadavg)
	// For simplicity, we just set it to 0 or we could read /proc/loadavg
	pl.LoadAvg = 0.5 

	return pl
}
