package securityscan

import (
	"context"
	"time"
)

type Mode string
const ( Passive Mode = "passive"; SafeActive Mode = "safe_active" )
type JobStatus string
const ( Queued JobStatus = "queued"; Running JobStatus = "running"; Completed JobStatus = "completed"; Failed JobStatus = "failed" )
type FindingStatus string
const ( Pass FindingStatus = "pass"; FindingFail FindingStatus = "fail"; Warning FindingStatus = "warning"; NotTestable FindingStatus = "not_testable"; FindingError FindingStatus = "error" )
type Severity string
const ( Info Severity = "info"; Low Severity = "low"; Medium Severity = "medium"; High Severity = "high"; Critical Severity = "critical" )

type Job struct { ID, Subdomain, TargetURL string; Status JobStatus; Mode Mode; RequestedAt time.Time; StartedAt, CompletedAt *time.Time; TotalChecks, PassedChecks, FailedChecks, WarningChecks, NotTestableChecks int; ErrorMessage *string }
type Finding struct { ID string `json:"id,omitempty"`; JobID string `json:"job_id,omitempty"`; OWASPID string `json:"owasp_id"`; Title string `json:"title"`; Severity Severity `json:"severity"`; Status FindingStatus `json:"status"`; Endpoint *string `json:"endpoint,omitempty"`; Method *string `json:"method,omitempty"`; Evidence map[string]any `json:"evidence"`; Remediation string `json:"remediation"`; CreatedAt time.Time `json:"created_at,omitempty"`; Assessment string `json:"assessment,omitempty"` }
type CreateRequest struct { Subdomain string `json:"subdomain" binding:"required"`; Mode Mode `json:"mode"` }
type ScanPlan struct { JobID string `json:"job_id"`; TargetURL string `json:"target_url"`; Mode Mode `json:"mode"`; AllowedMethods []string `json:"allowed_methods"`; RequestBudget int `json:"request_budget"`; RateLimitPerSecond int `json:"rate_limit_per_second"`; KnownTestEndpoints []string `json:"known_test_endpoints"`; OpenAPIURL *string `json:"openapi_url"` }
type ScanReport struct { Findings []Finding `json:"findings"`; RequestsUsed int `json:"requests_used"`; DurationMillis int64 `json:"duration_millis"` }
type Limits struct { MaxDuration time.Duration; RequestBudget, MaxWorkers, RateLimitPerSecond int; MaxResponseBytes int64; ConnectTimeout, RequestTimeout time.Duration }
func DefaultLimits() Limits { return Limits{MaxDuration: 60*time.Second, RequestBudget:80, MaxWorkers:4, RateLimitPerSecond:5, MaxResponseBytes:1<<20, ConnectTimeout:3*time.Second, RequestTimeout:8*time.Second} }
type TargetGuard interface { Validate(targetURL string) error }
type Runner interface { Run(ctx context.Context, plan ScanPlan) (ScanReport, error) }
