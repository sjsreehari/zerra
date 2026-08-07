package logger

import (
	"fmt"
	"time"
)

type LogLevel int

const (
	DEBUG LogLevel = iota
	INFO
	WARN
	ERROR
	FATAL
	SUCCESS
	INIT
)

const (
	Reset   = "\033[0m"
	Red     = "\033[31m"
	Green   = "\033[32m"
	Yellow  = "\033[33m"
	Blue    = "\033[34m"
	Cyan    = "\033[36m"
	Magenta = "\033[35m"
	White   = "\033[37m"
)

type Logger struct {
	minLevel LogLevel
}

func New(level LogLevel) *Logger {
	return &Logger{minLevel: level}
}

func (l *Logger) log(level LogLevel, label string, msg string, color string) {
	if level < l.minLevel {
		return
	}

	timestamp := time.Now().Format("2006-01-02 15:04:05")

	fmt.Printf("%s[%s] [%s] %s \n", color, timestamp, label, msg)
}

func (l *Logger) Info(msg string) {
	l.log(INFO, "INFO", msg, Blue)
}

func (l *Logger) WARN(msg string) {
	l.log(WARN, "WARN", msg, Yellow)
}

func (l *Logger) Error(msg string) {
	l.log(ERROR, "ERROR", msg, Red)
}

func (l *Logger) Success(msg string) {
	l.log(SUCCESS, "SUCCESS", msg, Green)
}

func (l *Logger) Fatal(msg string) {
	l.log(FATAL, "FATAL", msg, Magenta)
}

func (l *Logger) Debug(msg string) {
	l.log(DEBUG, "DEBUG", Cyan, msg)
}

func (l *Logger) Init() {
	l.log(INIT, "INIT", White, "")
}
