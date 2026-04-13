package collector

import (
	"bufio"
	"fmt"
	"os"
	"strconv"
	"strings"
)

// MemoryStats holds memory usage information
type MemoryStats struct {
	TotalKB      uint64
	AvailableKB  uint64
	UsagePercent float64
}

// CollectMemory reads /proc/meminfo and calculates memory usage
func CollectMemory() (*MemoryStats, error) {
	file, err := os.Open("/proc/meminfo")
	if err != nil {
		return nil, fmt.Errorf("failed to open /proc/meminfo: %w", err)
	}
	defer file.Close()

	memInfo := make(map[string]uint64)

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := scanner.Text()
		parts := strings.SplitN(line, ":", 2)
		if len(parts) != 2 {
			continue
		}

		key := strings.TrimSpace(parts[0])
		valStr := strings.TrimSpace(parts[1])
		valStr = strings.TrimSuffix(valStr, " kB")
		valStr = strings.TrimSpace(valStr)

		val, err := strconv.ParseUint(valStr, 10, 64)
		if err != nil {
			continue
		}

		memInfo[key] = val
	}

	total := memInfo["MemTotal"]
	available := memInfo["MemAvailable"]

	if total == 0 {
		return nil, fmt.Errorf("MemTotal not found in /proc/meminfo")
	}

	// If MemAvailable is not present (older kernels), estimate it
	if available == 0 {
		free := memInfo["MemFree"]
		buffers := memInfo["Buffers"]
		cached := memInfo["Cached"]
		available = free + buffers + cached
	}

	used := total - available
	usagePercent := float64(used) / float64(total) * 100.0

	return &MemoryStats{
		TotalKB:      total,
		AvailableKB:  available,
		UsagePercent: round2(usagePercent),
	}, nil
}
