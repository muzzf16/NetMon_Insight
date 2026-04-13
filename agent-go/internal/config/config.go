package config

import (
	"fmt"
	"os"

	"gopkg.in/yaml.v3"
)

// Config holds the agent configuration
type Config struct {
	Server     ServerConfig     `yaml:"server"`
	Interval   int              `yaml:"interval"`
	Hostname   string           `yaml:"hostname"`
	Ping       PingConfig       `yaml:"ping"`
	Interfaces InterfacesConfig `yaml:"interfaces"`
	Log        LogConfig        `yaml:"log"`
}

type ServerConfig struct {
	URL     string `yaml:"url"`
	APIKey  string `yaml:"api_key"`
	Timeout int    `yaml:"timeout"`
}

type PingConfig struct {
	Targets []string `yaml:"targets"`
	Count   int      `yaml:"count"`
	Timeout int      `yaml:"timeout"`
}

type InterfacesConfig struct {
	Include []string `yaml:"include"`
	Exclude []string `yaml:"exclude"`
}

type LogConfig struct {
	Level string `yaml:"level"`
	File  string `yaml:"file"`
}

// Load reads the configuration from a YAML file
func Load(path string) (*Config, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("failed to read config file: %w", err)
	}

	cfg := &Config{
		// Defaults
		Interval: 5,
		Server: ServerConfig{
			URL:     "http://localhost:3001/api/v1/metrics",
			Timeout: 10,
		},
		Ping: PingConfig{
			Count:   3,
			Timeout: 3,
		},
		Interfaces: InterfacesConfig{
			Exclude: []string{"lo", "docker0"},
		},
		Log: LogConfig{
			Level: "info",
		},
	}

	if err := yaml.Unmarshal(data, cfg); err != nil {
		return nil, fmt.Errorf("failed to parse config: %w", err)
	}

	// Validate
	if cfg.Interval < 1 {
		cfg.Interval = 5
	}
	if cfg.Server.URL == "" {
		return nil, fmt.Errorf("server.url is required")
	}

	// Auto-detect hostname if not set
	if cfg.Hostname == "" {
		hostname, err := os.Hostname()
		if err != nil {
			cfg.Hostname = "unknown"
		} else {
			cfg.Hostname = hostname
		}
	}

	return cfg, nil
}
