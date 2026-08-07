// Package proxy contains the HTTP adapter for dynamic, database-backed upstreams.
package proxy

import (
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
)

// SubdomainFromHost extracts the registered name from a host.  By default the
// local development base domain is 127.0.0.1, so qroasis.127.0.0.1:8080 becomes
// qroasis. Set BASE_DOMAIN for deployed environments, for example magma.com.
func SubdomainFromHost(host string) string {
	host = strings.ToLower(strings.TrimSpace(host))
	if colon := strings.LastIndex(host, ":"); colon > -1 {
		host = host[:colon]
	}

	baseDomain := os.Getenv("BASE_DOMAIN")
	if baseDomain == "" {
		baseDomain = "127.0.0.1"
	}
	baseDomain = strings.ToLower(strings.Split(baseDomain, ":")[0])

	suffix := "." + baseDomain
	if !strings.HasSuffix(host, suffix) {
		return ""
	}

	return strings.TrimSuffix(host, suffix)
}

// Forward proxies the current request to apiBaseURL while retaining the original
// HTTP method, path, query string, and request body.
func Forward(c *gin.Context, apiBaseURL string) error {
	target, err := url.Parse(apiBaseURL)
	if err != nil || target.Scheme == "" || target.Host == "" {
		return errInvalidUpstream
	}

	reverseProxy := httputil.NewSingleHostReverseProxy(target)
	reverseProxy.ErrorHandler = func(writer http.ResponseWriter, request *http.Request, proxyErr error) {
		writer.Header().Set("Content-Type", "application/json")
		writer.WriteHeader(502)
		_, _ = writer.Write([]byte(`{"error":"upstream API is unavailable"}`))
	}
	reverseProxy.ServeHTTP(c.Writer, c.Request)
	return nil
}

var errInvalidUpstream = &upstreamError{}

type upstreamError struct{}

func (e *upstreamError) Error() string { return "invalid upstream api_base_url" }
