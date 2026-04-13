package collector

import (
	"bufio"
	"fmt"
	"os"
	"strconv"
	"strings"
)

// CPUStats holds CPU usage information
type CPUStats struct {
	UsagePercent float64
}

// prevIdle and prevTotal for delta calculation
var prevIdle, prevTotal uint64

// CollectCPU reads /proc/stat and calculates CPU usage percentage
func CollectCPU() (*CPUStats, error) {
	file, err := os.Open("/proc/stat")
	if err != nil {
		return nil, fmt.Errorf("failed to open /proc/stat: %w", err)
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := scanner.Text()
		if !strings.HasPrefix(line, "cpu ") {
			continue
		}

		fields := strings.Fields(line)
		if len(fields) < 8 {
			return nil, fmt.Errorf("unexpected /proc/stat format")
		}

		// Parse fields: user, nice, system, idle, iowait, irq, softirq, steal
		var vals [8]uint64
		for i := 0; i < 8 && i+1 < len(fields); i++ {
			v, err := strconv.ParseUint(fields[i+1], 10, 64)
			if err != nil {
				return nil, fmt.Errorf("failed to parse cpu field %d: %w", i, err)
			}
			vals[i] = v
		}

		// idle = idle + iowait
		idle := vals[3] + vals[4]
		// total = sum of all fields
		var total uint64
		for _, v := range vals {
			total += v
		}

		// Calculate delta
		deltaIdle := idle - prevIdle
		deltaTotal := total - prevTotal

		prevIdle = idle
		prevTotal = total

		if deltaTotal == 0 {
			return &CPUStats{UsagePercent: 0}, nil
		}

		usage := (1.0 - float64(deltaIdle)/float64(deltaTotal)) * 100.0
		if usage < 0 {
			usage = 0
		}
		if usage > 100 {
			usage = 100
		}

		return &CPUStats{UsagePercent: round2(usage)}, nil
	}

	return nil, fmt.Errorf("cpu line not found in /proc/stat")
}

func round2(f float64) float64 {
	return float64(int(f*100)) / 100
}
