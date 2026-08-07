package proxy

import (
	"os"
	"testing"
)

func TestExtractSubdomain(t *testing.T) {
	tests := []struct {
		name     string
		host     string
		want     string
		baseHost string
	}{
		{name: "direct ip host", host: "qroasis.127.0.0.1:8080", want: "qroasis", baseHost: "127.0.0.1"},
		{name: "nip io host", host: "qroasis.127.0.0.1.nip.io:8080", want: "qroasis", baseHost: "127.0.0.1"},
		{name: "configured base domain", host: "foo.example.com:8080", want: "foo", baseHost: "example.com"},
		{name: "root domain", host: "127.0.0.1:8080", want: "", baseHost: "127.0.0.1"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			oldBaseDomain := os.Getenv("BASE_DOMAIN")
			defer func() {
				if oldBaseDomain == "" {
					_ = os.Unsetenv("BASE_DOMAIN")
				} else {
					_ = os.Setenv("BASE_DOMAIN", oldBaseDomain)
				}
			}()

			_ = os.Setenv("BASE_DOMAIN", tt.baseHost)
			if got := extractSubdomain(tt.host); got != tt.want {
				t.Fatalf("extractSubdomain(%q) = %q, want %q", tt.host, got, tt.want)
			}
		})
	}
}
