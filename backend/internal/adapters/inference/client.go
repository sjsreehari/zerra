// Package inference is the small Go-to-Python boundary for SENTRA decisions.
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

type decision struct {
	Verdict string `json:"verdict"`
	Reason  string `json:"reason"`
}

type callEvent struct {
	ID           string `json:"id"`
	IdentityID   string `json:"identity_id"`
	IdentityType string `json:"identity_type"`
	Timestamp    string `json:"timestamp"`
	Endpoint     string `json:"endpoint"`
	Method       string `json:"method"`
	ObjectID     string `json:"object_id,omitempty"`
	ObjectType   string `json:"object_type,omitempty"`
	TenantID     string `json:"tenant_id,omitempty"`
}

func New(baseURL string) *Client {
	return &Client{baseURL: strings.TrimRight(baseURL, "/"), http: &http.Client{Timeout: 3 * time.Second}}
}

// Evaluate converts a proxied request into the canonical event accepted by the
// local Python engine. This intentionally uses only demo bearer-token mappings.
func (c *Client) Evaluate(ctx context.Context, request *http.Request) (string, string, error) {
	identityID, identityType := identityFromToken(request.Header.Get("Authorization"))
	objectID, objectType, tenantID := objectFromPath(request.URL.Path)
	payload := callEvent{ID: fmt.Sprintf("proxy-%d", time.Now().UnixNano()), IdentityID: identityID,
		IdentityType: identityType, Timestamp: time.Now().UTC().Format(time.RFC3339Nano),
		Endpoint: request.URL.Path, Method: request.Method, ObjectID: objectID, ObjectType: objectType, TenantID: tenantID}
	body, err := json.Marshal(payload)
	if err != nil { return "", "", err }
	httpRequest, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+"/v1/evaluate", bytes.NewReader(body))
	if err != nil { return "", "", err }
	httpRequest.Header.Set("Content-Type", "application/json")
	response, err := c.http.Do(httpRequest)
	if err != nil { return "", "", err }
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK { return "", "", fmt.Errorf("inference returned %s", response.Status) }
	var result decision
	if err := json.NewDecoder(response.Body).Decode(&result); err != nil { return "", "", err }
	return result.Verdict, result.Reason, nil
}

func identityFromToken(header string) (string, string) {
	identities := map[string][2]string{
		"Bearer demo-human-token": {"human-alice", "human"},
		"Bearer demo-billing-token": {"billing-service", "service"},
		"Bearer demo-finance-agent-token": {"finance-agent", "agent"},
		"Bearer demo-attacker-token": {"attacker-agent", "agent"},
	}
	identity, ok := identities[header]
	if !ok {
		return "unknown", "human"
	}
	return identity[0], identity[1]
}

func objectFromPath(path string) (string, string, string) {
	parts := strings.Split(strings.Trim(path, "/"), "/")
	if len(parts) != 2 || parts[0] != "invoices" { return "", "", "" }
	tenant := ""
	if strings.HasPrefix(parts[1], "inv-a-") { tenant = "tenant-a" }
	if strings.HasPrefix(parts[1], "inv-b-") { tenant = "tenant-b" }
	if strings.HasPrefix(parts[1], "inv-c-") { tenant = "tenant-c" }
	return parts[1], "invoice", tenant
}
