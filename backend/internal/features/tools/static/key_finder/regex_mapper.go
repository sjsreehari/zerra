package static

import (
	"bufio"
	"crypto/sha256"
	"fmt"
	"io/fs"
	"math"
	"os"
	"path/filepath"
	"strings"
)

type RegexMapper struct {
	ruleSet  *RuleSet
	config   *Config
	findings []Finding
}

func NewRegexMapper() *RegexMapper {
	return &RegexMapper{
		ruleSet: NewRuleSet(),
		config:  DefaultConfig(),
	}
}

func (m *RegexMapper) WithConfig(cfg *Config) *RegexMapper {
	m.config = cfg
	return m
}

func (m *RegexMapper) WithRuleSet(rs *RuleSet) *RegexMapper {
	m.ruleSet = rs
	return m
}

func (m *RegexMapper) Findings() []Finding {
	return m.findings
}

func (m *RegexMapper) Reset() {
	m.findings = nil
}

func (m *RegexMapper) Scan(rootDir string) ([]Finding, error) {
	err := filepath.WalkDir(rootDir, m.walkFunc)
	if err != nil {
		return m.findings, err
	}
	return m.findings, nil
}

func (m *RegexMapper) walkFunc(path string, d fs.DirEntry, err error) error {
	if err != nil {
		return nil
	}
	if d.IsDir() {
		if m.config.IgnoreDirs[d.Name()] {
			return filepath.SkipDir
		}
		return nil
	}
	if m.config.IgnoreExts[strings.ToLower(filepath.Ext(path))] {
		return nil
	}

	info, err := d.Info()
	if err != nil || info.Size() == 0 || info.Size() > m.config.MaxFileSizeBytes {
		return nil
	}

	fileFindings, err := m.ScanFile(path)
	if err != nil {
		return nil
	}
	m.findings = append(m.findings, fileFindings...)
	return nil
}

func (m *RegexMapper) ScanFile(path string) ([]Finding, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer f.Close()

	if m.looksBinary(f) {
		return nil, nil
	}
	if _, err := f.Seek(0, 0); err != nil {
		return nil, err
	}

	var findings []Finding
	scanner := bufio.NewScanner(f)
	scanner.Buffer(make([]byte, 0, 64*1024), 1024*1024)

	lineNo := 0
	for scanner.Scan() {
		lineNo++
		line := scanner.Text()
		trimmed := strings.TrimSpace(line)

		if m.isLikelyPlaceholder(trimmed) {
			continue
		}

		findings = append(findings, m.matchRules(path, lineNo, line)...)

		if f := m.checkEntropy(path, lineNo, line); f != nil {
			findings = append(findings, *f)
		}
	}

	return findings, scanner.Err()
}

func (m *RegexMapper) matchRules(path string, lineNo int, line string) []Finding {
	var out []Finding
	for _, rule := range m.ruleSet.Rules() {
		if loc := rule.Pattern.FindStringIndex(line); loc != nil {
			match := line[loc[0]:loc[1]]
			out = append(out, Finding{
				File:     path,
				Line:     lineNo,
				RuleName: rule.Name,
				Match:    m.redact(match),
				Snippet:  strings.TrimSpace(line),
			})
		}
	}
	return out
}

func (m *RegexMapper) checkEntropy(path string, lineNo int, line string) *Finding {
	match := entropyAssignPattern.FindStringSubmatch(line)
	if match == nil {
		return nil
	}
	candidate := match[2]
	entropy := shannonEntropy(candidate)
	if entropy < m.config.EntropyThreshold {
		return nil
	}
	return &Finding{
		File:     path,
		Line:     lineNo,
		RuleName: "High-Entropy String (heuristic)",
		Match:    m.redact(candidate),
		Snippet:  strings.TrimSpace(line),
		Entropy:  entropy,
	}
}

func (m *RegexMapper) redact(s string) string {
	if !m.config.RedactMatches {
		return s
	}
	if len(s) <= 8 {
		return strings.Repeat("*", len(s))
	}
	sum := sha256.Sum256([]byte(s))
	return fmt.Sprintf("%s...%s (sha256:%x)", s[:4], s[len(s)-4:], sum[:4])
}

func (m *RegexMapper) looksBinary(f *os.File) bool {
	buf := make([]byte, 8192)
	n, _ := f.Read(buf)
	for i := 0; i < n; i++ {
		if buf[i] == 0 {
			return true
		}
	}
	return false
}

func (m *RegexMapper) isLikelyPlaceholder(line string) bool {
	lower := strings.ToLower(line)
	placeholders := []string{
		"your_api_key", "your-api-key", "xxxxxxxx", "changeme",
		"example.com", "<api_key>", "insert_key_here", "dummy", "test_key_123",
	}
	for _, p := range placeholders {
		if strings.Contains(lower, p) {
			return true
		}
	}
	return false
}

func shannonEntropy(s string) float64 {
	if len(s) == 0 {
		return 0
	}
	freq := make(map[rune]float64)
	for _, r := range s {
		freq[r]++
	}
	var entropy float64
	length := float64(len(s))
	for _, count := range freq {
		p := count / length
		entropy -= p * math.Log2(p)
	}
	return entropy
}
