package collector

import (
	"fmt"
	"math"
	"time"

	probing "github.com/go-ping/ping"
)

// PingResult holds ICMP ping results
type PingResult struct {
	Target     string
	Latency    float64 // ms (avg)
	PacketLoss float64 // percentage
	Jitter     float64 // ms (stddev)
	MinRTT     float64 // ms
	MaxRTT     float64 // ms
}

// CollectPing performs ICMP ping to a target host
func CollectPing(target string, count int, timeoutSec int) (*PingResult, error) {
	pinger, err := probing.NewPinger(target)
	if err != nil {
		return nil, fmt.Errorf("failed to create pinger for %s: %w", target, err)
	}

	pinger.Count = count
	pinger.Timeout = time.Duration(timeoutSec) * time.Second
	pinger.SetPrivileged(true) // Requires root or CAP_NET_RAW

	err = pinger.Run()
	if err != nil {
		return nil, fmt.Errorf("ping failed for %s: %w", target, err)
	}

	stats := pinger.Statistics()

	latency := float64(stats.AvgRtt.Microseconds()) / 1000.0
	minRTT := float64(stats.MinRtt.Microseconds()) / 1000.0
	maxRTT := float64(stats.MaxRtt.Microseconds()) / 1000.0
	jitter := float64(stats.StdDevRtt.Microseconds()) / 1000.0
	packetLoss := stats.PacketLoss

	return &PingResult{
		Target:     target,
		Latency:    roundN(latency, 2),
		PacketLoss: roundN(packetLoss, 2),
		Jitter:     roundN(jitter, 2),
		MinRTT:     roundN(minRTT, 2),
		MaxRTT:     roundN(maxRTT, 2),
	}, nil
}

func roundN(f float64, n int) float64 {
	pow := math.Pow(10, float64(n))
	return math.Round(f*pow) / pow
}
