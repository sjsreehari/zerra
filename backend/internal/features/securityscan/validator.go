package securityscan

import "fmt"

func ValidateReport(report ScanReport, limits Limits) error {
	if report.RequestsUsed < 0 || report.RequestsUsed > limits.RequestBudget {
		return fmt.Errorf("scanner request budget exceeded")
	}
	for _, finding := range report.Findings {
		if finding.OWASPID == "" || finding.Title == "" || finding.Remediation == "" {
			return fmt.Errorf("scanner finding is missing required fields")
		}
		if finding.Status != Pass && finding.Status != FindingFail && finding.Status != Warning && finding.Status != NotTestable && finding.Status != FindingError {
			return fmt.Errorf("scanner finding has invalid status")
		}
	}
	return nil
}

// NoopTargetGuard accepts all targets. Use when no external scanner adapter is configured.
type NoopTargetGuard struct{}

func (NoopTargetGuard) Validate(_ string) error { return nil }

