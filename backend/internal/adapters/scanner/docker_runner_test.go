package scanner

import "testing"

func TestParseReportAcceptsJSONEnvelope(t *testing.T) {
	report, err := parseReport([]byte(`{"requests_used":1,"findings":[{"owasp_id":"API8:2023","title":"Security Misconfiguration","severity":"medium","status":"warning","evidence":{"status_code":200},"remediation":"Set security headers."}]}`))
	if err != nil || len(report.Findings) != 1 || report.Findings[0].OWASPID != "API8:2023" { t.Fatalf("report was not parsed: %#v, %v", report, err) }
}

func TestParseReportAcceptsNDJSON(t *testing.T) {
	report, err := parseReport([]byte("{\"owasp_id\":\"API2:2023\",\"title\":\"Authentication\",\"severity\":\"high\",\"status\":\"pass\",\"evidence\":{},\"remediation\":\"Require authentication.\"}\n"))
	if err != nil || len(report.Findings) != 1 || report.Findings[0].OWASPID != "API2:2023" { t.Fatalf("NDJSON was not parsed: %#v, %v", report, err) }
}
