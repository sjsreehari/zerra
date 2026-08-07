package static

import "regexp"

type Finding struct {
	File     string  `json:"file"`
	Line     int     `json:"line"`
	RuleName string  `json:"rule_name"`
	Match    string  `json:"match"`
	Snippet  string  `json:"snippet"`
	Entropy  float64 `json:"entropy,omitempty"`
}

type Rule struct {
	Name    string
	Pattern *regexp.Regexp
}

type Config struct {
	IgnoreDirs       map[string]bool
	IgnoreExts       map[string]bool
	MaxFileSizeBytes int64
	EntropyThreshold float64
	RedactMatches    bool
}

func DefaultConfig() *Config {
	return &Config{
		IgnoreDirs: map[string]bool{
			".git":         true,
			"node_modules": true,
			"vendor":       true,
			"dist":         true,
			"build":        true,
			".venv":        true,
			"__pycache__":  true,
		},
		IgnoreExts: map[string]bool{
			".png": true, ".jpg": true, ".jpeg": true, ".gif": true, ".ico": true,
			".woff": true, ".woff2": true, ".ttf": true, ".eot": true,
			".zip": true, ".tar": true, ".gz": true, ".exe": true, ".dll": true,
			".so": true, ".bin": true, ".pdf": true, ".lock": true,
		},
		MaxFileSizeBytes: 5 * 1024 * 1024,
		EntropyThreshold: 4.3,
		RedactMatches:    true,
	}
}
