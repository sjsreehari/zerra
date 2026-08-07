package main

import (
	"net/url"
	"strings"
	"sync"
)

type APIRoute struct {
	Subdomain   string
	TargetURL   *url.URL
	RequireAuth bool
	AllowedIPs  []string
}

type Registry struct {
	mu     sync.RWMutex
	routes map[string]*APIRoute
}

func NewRegistry() *Registry {
	return &Registry{routes: make(map[string]*APIRoute)}
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

const baseDomain = "magma.com"

func extractSubdomain(host string) string {
	host = strings.Split(host, ":")[0]
	suffix := "." + baseDomain
	if !strings.HasSuffix(host, suffix) {
		return ""
	}
	return strings.TrimSuffix(host, suffix)
}

type registerRequest struct {
	Subdomain string `json:"subdomain"`
	TargetURL string `json:"target_url"`
}
