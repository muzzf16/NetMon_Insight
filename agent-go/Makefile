.PHONY: build build-linux clean run help

# Variables
APP_NAME := netmon-agent
VERSION := 1.0.0
BUILD_TIME := $(shell date -u '+%Y-%m-%dT%H:%M:%SZ')
LDFLAGS := -ldflags "-s -w -X main.version=$(VERSION) -X main.buildTime=$(BUILD_TIME)"

## help: Show this help message
help:
	@echo ""
	@echo "NetMon Insight Agent - Build Commands"
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@echo ""
	@echo "  make build         Build for current OS/arch"
	@echo "  make build-linux   Cross-compile for Linux (amd64)"
	@echo "  make build-arm     Cross-compile for Linux (ARM64, e.g. RPi)"
	@echo "  make run           Build and run locally"
	@echo "  make clean         Remove build artifacts"
	@echo "  make tidy          Run go mod tidy"
	@echo ""

## build: Build binary for current platform
build:
	go build $(LDFLAGS) -o $(APP_NAME) ./cmd/agent/

## build-linux: Cross-compile for Linux amd64
build-linux:
	GOOS=linux GOARCH=amd64 go build $(LDFLAGS) -o $(APP_NAME) ./cmd/agent/
	@echo "✅ Built $(APP_NAME) for linux/amd64"

## build-arm: Cross-compile for Linux ARM64
build-arm:
	GOOS=linux GOARCH=arm64 go build $(LDFLAGS) -o $(APP_NAME) ./cmd/agent/
	@echo "✅ Built $(APP_NAME) for linux/arm64"

## run: Build and run
run: build
	./$(APP_NAME)

## tidy: Go mod tidy
tidy:
	go mod tidy

## clean: Remove build artifacts
clean:
	rm -f $(APP_NAME)
	@echo "🧹 Cleaned"
