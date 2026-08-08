package auth

import (
	"strings"
	"testing"
	"time"
)

func TestIssuedSessionAuthenticatesAndRejectsTampering(t *testing.T) {
	service := NewService(nil, strings.Repeat("s", 32), time.Hour, false)
	service.now = func() time.Time { return time.Date(2026, 8, 8, 0, 0, 0, 0, time.UTC) }
	user := User{ID: "user-1", Email: "operator@example.test", Name: "Operator"}

	token, expires, err := service.Issue(user)
	if err != nil {
		t.Fatalf("issue session: %v", err)
	}
	if !expires.After(service.now()) {
		t.Fatal("session expiry must be in the future")
	}

	authenticated, err := service.Authenticate(token)
	if err != nil || authenticated != user {
		t.Fatalf("authenticate session: user=%+v err=%v", authenticated, err)
	}
	if _, err := service.Authenticate(token + "x"); err == nil {
		t.Fatal("tampered session was accepted")
	}
}

func TestExpiredSessionIsRejected(t *testing.T) {
	service := NewService(nil, strings.Repeat("s", 32), time.Hour, false)
	issuedAt := time.Date(2026, 8, 8, 0, 0, 0, 0, time.UTC)
	service.now = func() time.Time { return issuedAt }
	token, _, err := service.Issue(User{ID: "user-1", Email: "operator@example.test", Name: "Operator"})
	if err != nil {
		t.Fatalf("issue session: %v", err)
	}
	service.now = func() time.Time { return issuedAt.Add(time.Hour + time.Second) }
	if _, err := service.Authenticate(token); err == nil {
		t.Fatal("expired session was accepted")
	}
}
