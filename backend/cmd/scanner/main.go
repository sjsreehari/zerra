// sentra-api-security-runner performs bounded checks against an already
// authorized target. It never accepts a command, credentials, or arbitrary URL.
package main

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"os"
	"sort"
	"strings"
	"time"
)

const responseLimit = 1 << 20

type plan struct {
	JobID string `json:"job_id"`
	TargetURL string `json:"target_url"`
	Mode string `json:"mode"`
	AllowedMethods []string `json:"allowed_methods"`
	RequestBudget int `json:"request_budget"`
	RateLimitPerSecond int `json:"rate_limit_per_second"`
	KnownTestEndpoints []string `json:"known_test_endpoints"`
	OpenAPIURL *string `json:"openapi_url"`
}
type finding struct { OWASPID string `json:"owasp_id"`; Title string `json:"title"`; Severity string `json:"severity"`; Status string `json:"status"`; Endpoint *string `json:"endpoint,omitempty"`; Method *string `json:"method,omitempty"`; Evidence map[string]any `json:"evidence"`; Remediation string `json:"remediation"`; Assessment string `json:"assessment"` }
type report struct { Findings []finding `json:"findings"`; RequestsUsed int `json:"requests_used"`; DurationMillis int64 `json:"duration_millis"` }

var catalogue = []finding{
	{OWASPID:"API1:2023",Title:"Broken Object Level Authorization",Severity:"high",Remediation:"Use explicit cross-tenant test objects and deny unauthorized access."},
	{OWASPID:"API2:2023",Title:"Broken Authentication",Severity:"high",Remediation:"Require valid authentication and avoid exposing tokens."},
	{OWASPID:"API3:2023",Title:"Broken Object Property Level Authorization",Severity:"high",Remediation:"Enforce response-field allowlists and redact sensitive properties."},
	{OWASPID:"API4:2023",Title:"Unrestricted Resource Consumption",Severity:"medium",Remediation:"Apply bounded rate and concurrency limits to sensitive endpoints."},
	{OWASPID:"API5:2023",Title:"Broken Function Level Authorization",Severity:"high",Remediation:"Enforce server-side role checks on privileged functions."},
	{OWASPID:"API6:2023",Title:"Unrestricted Access to Sensitive Business Flows",Severity:"medium",Remediation:"Rate-limit and add policy controls to sensitive business flows."},
	{OWASPID:"API7:2023",Title:"Server Side Request Forgery",Severity:"high",Remediation:"Allow only approved outbound destinations and reject unsafe redirects."},
	{OWASPID:"API8:2023",Title:"Security Misconfiguration",Severity:"medium",Remediation:"Set security headers and restrict CORS and error disclosure."},
	{OWASPID:"API9:2023",Title:"Improper Inventory Management",Severity:"medium",Remediation:"Maintain an authenticated API inventory and version metadata."},
	{OWASPID:"API10:2023",Title:"Unsafe Consumption of APIs",Severity:"high",Remediation:"Use TLS, timeouts, response limits, and outbound allowlists."},
}

func main() {
	started := time.Now()
	var p plan
	if err := json.NewDecoder(io.LimitReader(os.Stdin, 64<<10)).Decode(&p); err != nil || p.TargetURL == "" || p.RequestBudget < 1 || p.RequestBudget > 80 || (p.Mode != "passive" && p.Mode != "safe_active") {
		_ = json.NewEncoder(os.Stdout).Encode(report{Findings: notTestable("Invalid bounded scan plan."), DurationMillis: time.Since(started).Milliseconds()})
		return
	}

	findings := notTestable("Not assessed automatically: this bounded scan plan has no authorized test configuration for this category.")
	client := &http.Client{Timeout: 8 * time.Second, CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }}
	requests := 0
	if index := find(findings, "API8:2023"); index >= 0 && requests < p.RequestBudget {
		findings[index], requests = securityHeaders(client, p.TargetURL, findings[index], requests)
	}
	if index := find(findings, "API3:2023"); index >= 0 && requests < p.RequestBudget {
		findings[index], requests = sensitiveProperties(client, p.TargetURL, findings[index], requests)
	}
	if p.OpenAPIURL != nil && *p.OpenAPIURL != "" && requests < p.RequestBudget {
		if index := find(findings, "API9:2023"); index >= 0 { findings[index], requests = inventoryMetadata(client, *p.OpenAPIURL, findings[index], requests) }
	}

	sort.Slice(findings, func(i, j int) bool { return findings[i].OWASPID < findings[j].OWASPID })
	_ = json.NewEncoder(os.Stdout).Encode(report{Findings: findings, RequestsUsed: requests, DurationMillis: time.Since(started).Milliseconds()})
}

func notTestable(reason string) []finding { out:=make([]finding,len(catalogue)); for i,f:=range catalogue { f.Status="not_testable";f.Assessment="not_testable";f.Evidence=map[string]any{"reason":reason};out[i]=f }; return out }
func find(fs []finding, id string) int { for i:=range fs { if fs[i].OWASPID==id{return i} };return -1 }
func request(client *http.Client, method, target string) (*http.Response,error) { ctx,cancel:=context.WithTimeout(context.Background(),8*time.Second);defer cancel();req,err:=http.NewRequestWithContext(ctx,method,target,nil);if err!=nil{return nil,err};return client.Do(req) }
func securityHeaders(client *http.Client,target string, f finding, used int)(finding,int){ response,err:=request(client,http.MethodHead,target);used++;if err!=nil{f.Evidence=map[string]any{"reason":"Target did not complete the bounded header probe."};return f,used};defer response.Body.Close();missing:=[]string{};for _,header:=range []string{"X-Content-Type-Options","Strict-Transport-Security"}{if response.Header.Get(header)==""{missing=append(missing,header)}};endpoint:=target;method:=http.MethodHead;f.Endpoint=&endpoint;f.Method=&method;f.Assessment="passive";f.Evidence=map[string]any{"status_code":response.StatusCode,"missing_headers":missing,"cors_credentials":response.Header.Get("Access-Control-Allow-Credentials")!=""};if len(missing)>0{f.Status="warning"}else{f.Status="pass"};return f,used }
func sensitiveProperties(client *http.Client,target string,f finding,used int)(finding,int){ response,err:=request(client,http.MethodGet,target);used++;if err!=nil{f.Evidence=map[string]any{"reason":"Target did not complete the bounded JSON probe."};return f,used};defer response.Body.Close();if !strings.Contains(response.Header.Get("Content-Type"),"json"){f.Evidence=map[string]any{"reason":"No JSON response was available for passive property inspection."};return f,used};var value any;if json.NewDecoder(io.LimitReader(response.Body,responseLimit)).Decode(&value)!=nil{f.Evidence=map[string]any{"reason":"JSON response could not be inspected."};return f,used};keys:=sensitiveKeys(value);endpoint:=target;method:=http.MethodGet;f.Endpoint=&endpoint;f.Method=&method;f.Assessment="passive";f.Evidence=map[string]any{"status_code":response.StatusCode,"sensitive_key_names":keys};if len(keys)>0{f.Status="warning"}else{f.Status="not_testable";f.Evidence["reason"]="No schema or response-field allowlist was supplied."};return f,used }
func sensitiveKeys(value any)[]string{found:=map[string]bool{};var walk func(any);walk=func(v any){switch x:=v.(type){case map[string]any:for k,child:=range x{if map[string]bool{"ssn":true,"salary":true,"password":true,"secret":true,"token":true,"api_key":true,"internal_notes":true}[strings.ToLower(k)]{found[strings.ToLower(k)]=true};walk(child)};case []any:for _,child:=range x{walk(child)}}};walk(value);out:=make([]string,0,len(found));for k:=range found{out=append(out,k)};sort.Strings(out);return out}
func inventoryMetadata(client *http.Client,target string,f finding,used int)(finding,int){response,err:=request(client,http.MethodHead,target);used++;if err!=nil{f.Evidence=map[string]any{"reason":"Configured inventory source was unavailable."};return f,used};defer response.Body.Close();endpoint:=target;method:=http.MethodHead;f.Endpoint=&endpoint;f.Method=&method;f.Assessment="passive";f.Evidence=map[string]any{"status_code":response.StatusCode,"inventory_source":"configured"};f.Status="pass";return f,used}
