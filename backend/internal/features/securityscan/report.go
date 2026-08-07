package securityscan
import("fmt";"strings")
func MarkdownReport(job Job, findings []Finding)string{var b strings.Builder;fmt.Fprintf(&b,"# API security scan\n\nTarget subdomain: `%s`\n\nMode: `%s`\n\n",job.Subdomain,job.Mode);b.WriteString("Safety limits: 60 seconds, 80 requests, 4 workers, 5 requests/second, 1 MB response cap.\n\n| OWASP | Result | Severity |\n|---|---|---|\n");for _,f:=range findings{fmt.Fprintf(&b,"| %s | %s | %s |\n",f.OWASPID,f.Status,f.Severity)};b.WriteString("\nResults are bounded checks, not a claim of compliance or security.\n");return b.String()}
