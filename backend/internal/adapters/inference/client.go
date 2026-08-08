package inference

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"
)

type Client struct {
	baseURL string
	http    *http.Client
}

type Decision struct {
	Verdict string          `json:"verdict"`
	Reason  string          `json:"reason"`
	Raw     json.RawMessage `json:"-"`
}

type CallEvent struct {
	ID                     string         `json:"id"`
	IdentityID             string         `json:"identity_id"`
	IdentityType           string         `json:"identity_type"`
	Timestamp              string         `json:"timestamp"`
	Endpoint               string         `json:"endpoint"`
	Method                 string         `json:"method"`
	ObjectID               string         `json:"object_id,omitempty"`
	ObjectType             string         `json:"object_type,omitempty"`
	TenantID               string         `json:"tenant_id,omitempty"`
	HomeTenantID           string         `json:"home_tenant_id,omitempty"`
	StatusCode             int            `json:"status_code"`
	ResponseFields         []string       `json:"response_fields"`
	SensitiveFieldsTouched []string       `json:"sensitive_fields_touched"`
	ScopeContract          []string       `json:"scope_contract,omitempty"`
	Metadata               map[string]any `json:"metadata"`
}

func New(baseURL string) *Client {
	return &Client{
		baseURL: strings.TrimRight(baseURL, "/"),
		http:    &http.Client{Timeout: 30 * time.Second},
	}
}

func (c *Client) BuildEvent(request *http.Request, id string) CallEvent {
	identityID, identityType, homeTenant, scope := identityFromToken(request.Header.Get("Authorization"))
	objectID, objectType, tenantID := objectFromPath(request.URL.Path)
	responseFields := []string{}
	sensitiveFields := []string{}
	if objectType == "invoice" {
		responseFields = []string{"id", "tenant_id", "amount", "status"}
		sensitiveFields = []string{"amount"}
	}
	return CallEvent{
		ID:                     id,
		IdentityID:             identityID,
		IdentityType:           identityType,
		Timestamp:              time.Now().UTC().Format(time.RFC3339Nano),
		Endpoint:               request.URL.Path,
		Method:                 request.Method,
		ObjectID:               objectID,
		ObjectType:             objectType,
		TenantID:               tenantID,
		HomeTenantID:           homeTenant,
		StatusCode:             200,
		ResponseFields:         responseFields,
		SensitiveFieldsTouched: sensitiveFields,
		ScopeContract:          scope,
		Metadata: map[string]any{
			"source_ip":          request.RemoteAddr,
			"request_size_bytes": request.ContentLength,
		},
	}
}

func (c *Client) Evaluate(ctx context.Context, event CallEvent) (Decision, error) {
	body, err := json.Marshal(event)
	if err != nil {
		return Decision{}, err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+"/v1/evaluate", bytes.NewReader(body))
	if err != nil {
		return Decision{}, err
	}
	req.Header.Set("Content-Type", "application/json")
	resp, err := c.http.Do(req)
	if err != nil {
		return Decision{}, err
	}
	defer resp.Body.Close()
	var raw json.RawMessage
	if err = json.NewDecoder(resp.Body).Decode(&raw); err != nil {
		return Decision{}, err
	}
	var decision Decision
	if err = json.Unmarshal(raw, &decision); err != nil {
		return Decision{}, err
	}
	if resp.StatusCode != http.StatusOK || decision.Verdict != "allow" && decision.Verdict != "step_up" && decision.Verdict != "block" {
		return Decision{}, fmt.Errorf("invalid inference response")
	}
	decision.Raw = raw
	return decision, nil
}

func identityFromToken(header string) (string, string, string, []string) {
	type info struct {
		id, typ, tenant string
		scope           []string
	}
	m := map[string]info{
		"Bearer demo-human-token":         {"human-alice", "human", "tenant-a", nil},
		"Bearer demo-billing-token":       {"billing-service", "service", "tenant-a", []string{"/invoices/*", "/users/*"}},
		"Bearer demo-finance-agent-token": {"finance-agent", "agent", "tenant-a", []string{"/invoices/*"}},
		"Bearer demo-attacker-token":      {"attacker-agent", "agent", "tenant-b", nil},
	}
	v, ok := m[header]
	if !ok {
		return "unknown", "human", "", nil
	}
	return v.id, v.typ, v.tenant, v.scope
}

func objectFromPath(path string) (string, string, string) {
	p := strings.Split(strings.Trim(path, "/"), "/")
	if len(p) != 2 || p[0] != "invoices" {
		return "", "", ""
	}
	t := ""
	if strings.HasPrefix(p[1], "inv-a-") {
		t = "tenant-a"
	}
	if strings.HasPrefix(p[1], "inv-b-") {
		t = "tenant-b"
	}
	if strings.HasPrefix(p[1], "inv-c-") {
		t = "tenant-c"
	}
	return p[1], "invoice", t
}
