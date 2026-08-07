package proxy

import (
	"context"
	"fmt"
	"net"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"strings"
	"sync"

	"github.com/gin-gonic/gin"
)

type APIRoute struct {
	Subdomain   string
	TargetURL   *url.URL
	RequireAuth bool
	AllowedIPs  []string
}

type Resolver interface {
	ResolveReverseProxy(ctx context.Context, subdomain string) (string, error)
}

type Registry struct {
	mu       sync.RWMutex
	routes   map[string]*APIRoute
	resolver Resolver
}

var DefaultRegistry = NewRegistry()

func NewRegistry() *Registry {
	return &Registry{routes: make(map[string]*APIRoute)}
}

func (r *Registry) SetResolver(resolver Resolver) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.resolver = resolver
}

func (r *Registry) Add(route *APIRoute) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.routes[route.Subdomain] = route
}

func (r *Registry) Get(subdomain string) (*APIRoute, bool) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	route, ok := r.routes[subdomain]
	return route, ok
}

func (r *Registry) AddRoute(subdomain, targetURL string) error {
	parsed, err := url.Parse(targetURL)
	if err != nil {
		return fmt.Errorf("invalid target url: %w", err)
	}

	route := &APIRoute{
		Subdomain: subdomain,
		TargetURL: parsed,
	}

	r.Add(route)
	return nil
}

func (r *Registry) Match(host string) (*APIRoute, bool) {
	subdomain := extractSubdomain(host)
	if subdomain == "" {
		return nil, false
	}
	return r.Get(subdomain)
}

func (r *Registry) Handler() gin.HandlerFunc {
	return func(c *gin.Context) {
		subdomainName := extractSubdomain(c.Request.Host)
		if subdomainName == "" {
			c.Next()
			return
		}

		var targetURL string
		if r.resolver != nil {
			var err error
			targetURL, err = r.resolver.ResolveReverseProxy(c.Request.Context(), subdomainName)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				c.Abort()
				return
			}
		} else {
			route, ok := r.Match(c.Request.Host)
			if !ok || route == nil || route.TargetURL == nil {
				c.Next()
				return
			}
			targetURL = route.TargetURL.String()
		}

		if targetURL == "" {
			c.Next()
			return
		}

		parsedTarget, err := url.Parse(targetURL)
		if err != nil {
			c.JSON(http.StatusBadGateway, gin.H{"error": "invalid target url"})
			c.Abort()
			return
		}

		proxy := httputil.NewSingleHostReverseProxy(parsedTarget)
		proxy.Director = func(targetReq *http.Request) {
			targetReq.URL.Scheme = parsedTarget.Scheme
			targetReq.URL.Host = parsedTarget.Host
			targetReq.Host = parsedTarget.Host
			targetReq.URL.Path = singleJoiningSlash(parsedTarget.Path, targetReq.URL.Path)
			if targetReq.URL.RawQuery == "" {
				targetReq.URL.RawQuery = parsedTarget.RawQuery
			}
		}

		proxy.ServeHTTP(c.Writer, c.Request)
		c.Abort()
	}
}

func RegisterRoute(subdomain, targetURL string) error {
	return DefaultRegistry.AddRoute(subdomain, targetURL)
}

func getBaseDomain() string {
	if d := os.Getenv("BASE_DOMAIN"); d != "" {
		return d
	}
	return "127.0.0.1:8080"
}

func baseDomainHost() string {
	return strings.Split(getBaseDomain(), ":")[0]
}

func extractSubdomain(host string) string {
	host = strings.ToLower(strings.TrimSpace(host))
	if host == "" {
		return ""
	}

	if h, _, err := net.SplitHostPort(host); err == nil {
		host = h
	} else {
		host = strings.Split(host, ":")[0]
	}

	for _, suffix := range []string{".nip.io", ".xip.io", ".sslip.io"} {
		if strings.HasSuffix(host, suffix) {
			host = strings.TrimSuffix(host, suffix)
			break
		}
	}

	base := strings.ToLower(baseDomainHost())
	if base == "" {
		return ""
	}

	if host == base {
		return ""
	}

	suffix := "." + base
	if strings.HasSuffix(host, suffix) {
		return strings.TrimSuffix(host, suffix)
	}

	return ""
}

func singleJoiningSlash(prefix, path string) string {
	if prefix == "" || prefix == "/" {
		return path
	}
	if path == "" {
		return prefix
	}
	if strings.HasSuffix(prefix, "/") && strings.HasPrefix(path, "/") {
		return prefix + strings.TrimPrefix(path, "/")
	}
	return prefix + path
}

type registerRequest struct {
	Subdomain string `json:"subdomain"`
	TargetURL string `json:"target_url"`
}
