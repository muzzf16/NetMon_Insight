package collector

import (
	"fmt"
	"os"
	"strings"
	"syscall"
)

// DiskStats holds disk usage for the root filesystem
type DiskStats struct {
	TotalGB      float64
	UsedGB       float64
	UsagePercent float64
	MountPoint   string
}

// CollectDisk uses syscall.Statfs to get disk usage for key mount points
func CollectDisk() (*DiskStats, error) {
	// Check root filesystem
	mountPoint := "/"

	// Try common mount points
	for _, mp := range []string{"/", "/data", "/home"} {
		if _, err := os.Stat(mp); err == nil {
			mountPoint = mp
			break
		}
	}

	var stat syscall.Statfs_t
	if err := syscall.Statfs(mountPoint, &stat); err != nil {
		return nil, fmt.Errorf("failed to statfs %s: %w", mountPoint, err)
	}

	totalBytes := stat.Blocks * uint64(stat.Bsize)
	freeBytes := stat.Bavail * uint64(stat.Bsize)
	usedBytes := totalBytes - freeBytes

	totalGB := float64(totalBytes) / (1024 * 1024 * 1024)
	usedGB := float64(usedBytes) / (1024 * 1024 * 1024)

	var usagePercent float64
	if totalBytes > 0 {
		usagePercent = float64(usedBytes) / float64(totalBytes) * 100.0
	}

	return &DiskStats{
		TotalGB:      round2(totalGB),
		UsedGB:       round2(usedGB),
		UsagePercent: round2(usagePercent),
		MountPoint:   mountPoint,
	}, nil
}

// CollectLoadAvg reads /proc/loadavg
func CollectLoadAvg() (float64, error) {
	data, err := os.ReadFile("/proc/loadavg")
	if err != nil {
		return 0, fmt.Errorf("failed to read /proc/loadavg: %w", err)
	}

	fields := strings.Fields(string(data))
	if len(fields) < 1 {
		return 0, fmt.Errorf("unexpected /proc/loadavg format")
	}

	var load float64
	_, err = fmt.Sscanf(fields[0], "%f", &load)
	if err != nil {
		return 0, fmt.Errorf("failed to parse load average: %w", err)
	}

	return round2(load), nil
}
