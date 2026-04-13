package logger

import (
	"fmt"
	"io"
	"log"
	"os"
	"strings"
	"time"
)

type Level int

const (
	DEBUG Level = iota
	INFO
	WARN
	ERROR
)

var levelNames = map[Level]string{
	DEBUG: "DBG",
	INFO:  "INF",
	WARN:  "WRN",
	ERROR: "ERR",
}

var levelColors = map[Level]string{
	DEBUG: "\033[36m", // cyan
	INFO:  "\033[32m", // green
	WARN:  "\033[33m", // yellow
	ERROR: "\033[31m", // red
}

const colorReset = "\033[0m"

// Logger is a simple leveled logger
type Logger struct {
	level   Level
	logger  *log.Logger
	colored bool
}

// New creates a new Logger
func New(level string, logFile string) *Logger {
	var l Level
	switch strings.ToLower(level) {
	case "debug":
		l = DEBUG
	case "warn", "warning":
		l = WARN
	case "error":
		l = ERROR
	default:
		l = INFO
	}

	var writer io.Writer = os.Stdout
	colored := true

	if logFile != "" {
		f, err := os.OpenFile(logFile, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0644)
		if err != nil {
			fmt.Fprintf(os.Stderr, "Failed to open log file %s: %v, using stdout\n", logFile, err)
		} else {
			writer = f
			colored = false
		}
	}

	return &Logger{
		level:   l,
		logger:  log.New(writer, "", 0),
		colored: colored,
	}
}

func (lg *Logger) log(level Level, format string, args ...interface{}) {
	if level < lg.level {
		return
	}

	timestamp := time.Now().Format("15:04:05")
	msg := fmt.Sprintf(format, args...)
	prefix := levelNames[level]

	if lg.colored {
		color := levelColors[level]
		lg.logger.Printf("%s %s%s%s %s", timestamp, color, prefix, colorReset, msg)
	} else {
		lg.logger.Printf("%s %s %s", timestamp, prefix, msg)
	}
}

func (lg *Logger) Debug(format string, args ...interface{}) { lg.log(DEBUG, format, args...) }
func (lg *Logger) Info(format string, args ...interface{})  { lg.log(INFO, format, args...) }
func (lg *Logger) Warn(format string, args ...interface{})  { lg.log(WARN, format, args...) }
func (lg *Logger) Error(format string, args ...interface{}) { lg.log(ERROR, format, args...) }
