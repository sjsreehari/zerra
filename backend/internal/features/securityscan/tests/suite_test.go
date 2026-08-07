package tests

import (
	"testing"
	"github.com/sjsreehari/zerra/internal/features/securityscan"
)

func TestEveryOWASPCheckHasStructuredNotTestableFallback(t *testing.T) {
	findings := securityscan.DefaultFindings()
	if len(findings) != 10 { t.Fatalf("got %d findings, want 10", len(findings)) }
	for _, finding := range findings {
		if finding.OWASPID == "" || finding.Remediation == "" || finding.Status != securityscan.NotTestable { t.Fatalf("invalid fallback finding: %#v", finding) }
	}
}

func TestReportRejectsRequestBudgetAndInvalidFindings(t *testing.T) {
	if securityscan.ValidateReport(securityscan.ScanReport{RequestsUsed: 81}, securityscan.DefaultLimits()) == nil { t.Fatal("expected request budget rejection") }
	if securityscan.ValidateReport(securityscan.ScanReport{Findings: []securityscan.Finding{{OWASPID:"API1:2023"}}}, securityscan.DefaultLimits()) == nil { t.Fatal("expected malformed finding rejection") }
}
