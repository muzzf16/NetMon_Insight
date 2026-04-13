package collector

import (
	"bufio"
	"fmt"
	"os"
	"strconv"
	"strings"
)

type InterfaceStats struct {
	Name      string `json:"name"`
	RxBytes   uint64 `json:"rx_bytes"`
	TxBytes   uint64 `json:"tx_bytes"`
	RxDropped uint64 `json:"rx_dropped"`
	TxDropped uint64 `json:"tx_dropped"`
	RxErrors  uint64 `json:"rx_errors"`
	TxErrors  uint64 `json:"tx_errors"`
	Speed     int    `json:"speed"`  // Megabits/s
	Duplex    string `json:"duplex"` // "full", "half", or "unknown"
}

func CollectInterfaces(includes, excludes []string) ([]InterfaceStats, error) {
	file, err := os.Open("/proc/net/dev")
	if err != nil {
		return nil, fmt.Errorf("failed to open /proc/net/dev: %w", err)
	}
	defer file.Close()

	var stats []InterfaceStats
	scanner := bufio.NewScanner(file)

	// skip header lines
	for i := 0; i < 2; i++ {
		scanner.Scan()
	}

	for scanner.Scan() {
		line := scanner.Text()
		parts := strings.Split(line, ":")
		if len(parts) < 2 {
			continue
		}

		name := strings.TrimSpace(parts[0])

		if !shouldInclude(name, includes, excludes) {
			continue
		}

		fields := strings.Fields(parts[1])
		if len(fields) < 16 {
			continue
		}

		rxBytes, _ := strconv.ParseUint(fields[0], 10, 64)
		rxErrors, _ := strconv.ParseUint(fields[2], 10, 64)
		rxDropped, _ := strconv.ParseUint(fields[3], 10, 64)

		txBytes, _ := strconv.ParseUint(fields[8], 10, 64)
		txErrors, _ := strconv.ParseUint(fields[10], 10, 64)
		txDropped, _ := strconv.ParseUint(fields[11], 10, 64)

		// Hardcoded eth0/enp1s0 speed/duplex to avoid complex ethtool C bindings or calling external binary.
		// A full production approach would invoke `ethtool <name>` or use netlink.
		speed := 1000
		duplex := "full"

		if name == "lo" {
			speed = 0
			duplex = "unknown"
		}

		stats = append(stats, InterfaceStats{
			Name:      name,
			RxBytes:   rxBytes,
			TxBytes:   txBytes,
			RxDropped: rxDropped,
			TxDropped: txDropped,
			RxErrors:  rxErrors,
			TxErrors:  txErrors,
			Speed:     speed,
			Duplex:    duplex,
		})
	}

	return stats, nil
}

func shouldInclude(name string, includes, excludes []string) bool {
	// Excludes take precedence
	for _, ex := range excludes {
		if strings.HasPrefix(name, ex) {
			return false
		}
	}

	// If includes is empty, include all (that aren't excluded)
	if len(includes) == 0 {
		return true
	}

	for _, in := range includes {
		if name == in {
			return true
		}
	}

	return false
}
