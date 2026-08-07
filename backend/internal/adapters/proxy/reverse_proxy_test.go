package proxy

import (
	"bytes"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestSubdomainFromHost(t *testing.T) {
	t.Setenv("BASE_DOMAIN", "127.0.0.1")

	for _, test := range []struct {
		host string
		want string
	}{
		{"qroasis.127.0.0.1:8080", "qroasis"},
		{"qroasis.127.0.0.1.nip.io:8080", "qroasis"},
		{"127.0.0.1:8080", ""},
		{"unrelated.example.test:8080", ""},
	} {
		t.Run(test.host, func(t *testing.T) {
			if got := SubdomainFromHost(test.host); got != test.want {
				t.Fatalf("SubdomainFromHost(%q) = %q, want %q", test.host, got, test.want)
			}
		})
	}
}

func TestForwardProxiesRequestWithoutRedirectingClient(t *testing.T) {
	gin.SetMode(gin.TestMode)
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/api/invoices" || r.URL.RawQuery != "page=2" {
			t.Errorf("upstream path = %q?%s", r.URL.Path, r.URL.RawQuery)
		}
		if r.Method != http.MethodPost {
			t.Errorf("upstream method = %s", r.Method)
		}
		if got, _ := io.ReadAll(r.Body); string(got) != `{"hello":"world"}` {
			t.Errorf("upstream body = %q", got)
		}
		if r.Host == "qroasis.127.0.0.1:8080" {
			t.Error("gateway host was forwarded to upstream")
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"source":"upstream"}`))
	}))
	defer upstream.Close()

	recorder := httptest.NewRecorder()
	context, _ := gin.CreateTestContext(recorder)
	request := httptest.NewRequest(http.MethodPost, "http://qroasis.127.0.0.1:8080/api/invoices?page=2", bytes.NewBufferString(`{"hello":"world"}`))
	request.Host = "qroasis.127.0.0.1:8080"
	context.Request = request

	if err := Forward(context, upstream.URL); err != nil {
		t.Fatalf("Forward() error = %v", err)
	}
	if recorder.Code != http.StatusOK || recorder.Body.String() != `{"source":"upstream"}` {
		t.Fatalf("response = %d %s", recorder.Code, recorder.Body.String())
	}
}

func TestForwardRewritesUpstreamRedirectToGateway(t *testing.T) {
	gin.SetMode(gin.TestMode)
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.Redirect(w, r, "https://upstream.example.test/login", http.StatusFound)
	}))
	defer upstream.Close()

	recorder := httptest.NewRecorder()
	context, _ := gin.CreateTestContext(recorder)
	request := httptest.NewRequest(http.MethodGet, "http://qroasis.127.0.0.1:8080/private", nil)
	request.Host = "qroasis.127.0.0.1:8080"
	context.Request = request

	if err := Forward(context, upstream.URL); err != nil {
		t.Fatalf("Forward() error = %v", err)
	}
	if got, want := recorder.Header().Get("Location"), "http://qroasis.127.0.0.1:8080/login"; got != want {
		t.Fatalf("Location = %q, want %q", got, want)
	}
}
