package static

import "regexp"

type RuleSet struct {
	rules []Rule
}

func NewRuleSet() *RuleSet {
	rs := &RuleSet{}
	rs.loadDefaults()
	return rs
}

func (rs *RuleSet) Rules() []Rule {
	return rs.rules
}

func (rs *RuleSet) AddRule(name, pattern string) error {
	compiled, err := regexp.Compile(pattern)
	if err != nil {
		return err
	}
	rs.rules = append(rs.rules, Rule{Name: name, Pattern: compiled})
	return nil
}

func (rs *RuleSet) loadDefaults() {
	raw := map[string]string{
		"AWS Access Key ID":     `\bAKIA[0-9A-Z]{16}\b`,
		"AWS Secret Access Key": `(?i)aws(.{0,20})?(secret|access)?_?key(.{0,20})?['"]\s*[:=]\s*['"][A-Za-z0-9/+=]{40}['"]`,
	}

	for name, pattern := range raw {
		rs.rules = append(rs.rules, Rule{
			Name:    name,
			Pattern: regexp.MustCompile(pattern),
		})
	}
}

var entropyAssignPattern = regexp.MustCompile(
	`(?i)(key|secret|token|password|passwd|pwd|credential)\w*\s*[:=]\s*['"]([A-Za-z0-9+/_\-=]{20,})['"]`,
)
