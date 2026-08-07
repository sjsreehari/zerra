package scanner

import (
	"net"
	"testing"
)

func TestTargetGuardRejectsUnsafeProductionTargets(t *testing.T) {
	guard := TargetGuard{Environment: "production", Resolver: func(string) ([]net.IP, error) { return []net.IP{net.ParseIP("127.0.0.1")}, nil }}
	if guard.Validate("https://registered.example") == nil { t.Fatal("loopback target must be rejected") }
}

func TestTargetGuardAllowsLocalHTTPOnlyInDevelopment(t *testing.T) {
	guard := TargetGuard{Environment: "development", Resolver: func(string) ([]net.IP, error) { return []net.IP{net.ParseIP("127.0.0.1")}, nil }}
	if err := guard.Validate("http://localhost:8080"); err != nil { t.Fatalf("development target rejected: %v", err) }
}
