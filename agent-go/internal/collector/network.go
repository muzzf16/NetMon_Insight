package collector

import (
	"fmt"
	"math"
	"time"

	"github.com/go-ping/ping"
)

type NetworkStats struct {
	Latency    float64
	PacketLoss float64
	Jitter     float64
}

// CollectNetwork pings the target and calculates latency, loss, and apparent jitter
func CollectNetwork(target string, count int, timeoutSec int) (*NetworkStats, error) {
	pinger, err := ping.NewPinger(target)
	if err != nil {
		return nil, fmt.Errorf("failed to create pinger: %w", err)
	}

	pinger.SetPrivileged(false) // works on linux if sysctl net.ipv4.ping_group_range is set
	pinger.Count = count
	pinger.Timeout = time.Duration(timeoutSec) * time.Second

	err = pinger.Run()
	if err != nil {
		return nil, fmt.Errorf("ping run failed: %w", err)
	}

	stats := pinger.Statistics()
	
	// Convert standard deviation of RTT to "jitter" roughly
	jitterMs := float64(stats.StdDevRtt.Microseconds()) / 1000.0
	latencyMs := float64(stats.AvgRtt.Microseconds()) / 1000.0

	return &NetworkStats{
		Latency:    round2(latencyMs),
		PacketLoss: round2(stats.PacketLoss),
		Jitter:     round2(jitterMs),
	}, nil
}
