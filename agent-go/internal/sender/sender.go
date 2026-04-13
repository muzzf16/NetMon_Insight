package sender

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

// MetricsPayload matches the backend POST /api/v1/metrics schema
type MetricsPayload struct {
	Hostname   string          `json:"hostname"`
	IPAddress  string          `json:"ip_address,omitempty"`
	CPU        float64         `json:"cpu"`
	Memory     float64         `json:"memory"`
	Disk       float64         `json:"disk"`
	LoadAvg    float64         `json:"load_avg"`
	Latency    *float64        `json:"latency,omitempty"`
	PacketLoss *float64        `json:"packet_loss,omitempty"`
	Jitter     *float64        `json:"jitter,omitempty"`
	TargetHost string          `json:"target_host,omitempty"`
	Interfaces []InterfaceData `json:"interfaces"`
}

// InterfaceData matches the backend interface schema
type InterfaceData struct {
	Name      string `json:"name"`
	RxBytes   uint64 `json:"rx_bytes"`
	TxBytes   uint64 `json:"tx_bytes"`
	RxDropped uint64 `json:"rx_dropped"`
	TxDropped uint64 `json:"tx_dropped"`
	RxErrors  uint64 `json:"rx_errors"`
	TxErrors  uint64 `json:"tx_errors"`
	Speed     int    `json:"speed,omitempty"`
	Duplex    string `json:"duplex,omitempty"`
}

// APIResponse represents the backend response
type APIResponse struct {
	Status          string `json:"status"`
	AlertsGenerated int    `json:"alerts_generated"`
	InsightsCount   int    `json:"insights_count"`
	Error           string `json:"error,omitempty"`
}

// Sender handles HTTP communication with the backend
type Sender struct {
	url    string
	apiKey string
	client *http.Client
}

// New creates a new Sender instance
func New(url, apiKey string, timeoutSec int) *Sender {
	return &Sender{
		url:    url,
		apiKey: apiKey,
		client: &http.Client{
			Timeout: time.Duration(timeoutSec) * time.Second,
		},
	}
}

// Send sends the metrics payload to the backend API
func (s *Sender) Send(payload *MetricsPayload) (*APIResponse, error) {
	body, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal payload: %w", err)
	}

	req, err := http.NewRequest("POST", s.url, bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	if s.apiKey != "" {
		req.Header.Set("X-API-Key", s.apiKey)
	}

	resp, err := s.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("API returned status %d: %s", resp.StatusCode, string(respBody))
	}

	var apiResp APIResponse
	if err := json.Unmarshal(respBody, &apiResp); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	return &apiResp, nil
}
