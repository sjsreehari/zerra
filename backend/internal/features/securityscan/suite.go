package securityscan

var checks = []struct{ id,title,remediation string; severity Severity }{
 {"API1:2023","Broken Object Level Authorization","Use explicit cross-tenant test objects and deny unauthorized access.",High},
 {"API2:2023","Broken Authentication","Require valid authentication and avoid exposing tokens.",High},
 {"API3:2023","Broken Object Property Level Authorization","Enforce response field allowlists and redact sensitive fields.",High},
 {"API4:2023","Unrestricted Resource Consumption","Apply bounded rate and concurrency limits.",Medium},
 {"API5:2023","Broken Function Level Authorization","Enforce role checks on privileged functions.",High},
 {"API6:2023","Unrestricted Access to Sensitive Business Flows","Rate-limit and protect sensitive business flows.",Medium},
 {"API7:2023","Server Side Request Forgery","Allow only approved outbound destinations and reject redirects.",High},
 {"API8:2023","Security Misconfiguration","Set secure headers and constrain CORS and error disclosure.",Medium},
 {"API9:2023","Improper Inventory Management","Maintain an authenticated API inventory and supported versions.",Medium},
 {"API10:2023","Unsafe Consumption of APIs","Use TLS, timeouts, size limits, and outbound allowlists.",High},
}
func DefaultFindings() []Finding { out:=make([]Finding,0,len(checks));for _,c:=range checks{out=append(out,Finding{OWASPID:c.id,Title:c.title,Severity:c.severity,Status:NotTestable,Evidence:map[string]any{"reason":"No validated scanner report was available for this bounded check."},Remediation:c.remediation,Assessment:"not_testable"})};return out }
