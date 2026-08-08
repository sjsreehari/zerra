package auth

import (
	"crypto/hmac"
	"crypto/sha256"
	"database/sql"
	"encoding/base64"
	"encoding/json"
	"errors"
	"net/http"
	"net/mail"
	"strings"
	"time"

	"golang.org/x/crypto/bcrypt"
)

const CookieName = "zerra_session"

var (
	ErrInvalidCredentials = errors.New("invalid email or password")
	ErrEmailTaken         = errors.New("an account with that email already exists")
	ErrInvalidSession     = errors.New("invalid or expired session")
	ErrInvalidRegistration = errors.New("name, a valid email, and a password of at least 12 characters are required")
)

type User struct {
	ID    string `json:"id"`
	Email string `json:"email"`
	Name  string `json:"name"`
}

type Service struct {
	db        *sql.DB
	secret    []byte
	ttl       time.Duration
	secure    bool
	now       func() time.Time
}

type claims struct {
	Subject string `json:"sub"`
	Email   string `json:"email"`
	Name    string `json:"name"`
	Issuer  string `json:"iss"`
	Issued  int64  `json:"iat"`
	Expires int64  `json:"exp"`
}

func NewService(db *sql.DB, secret string, ttl time.Duration, secure bool) *Service {
	if ttl <= 0 {
		ttl = 24 * time.Hour
	}
	return &Service{db: db, secret: []byte(secret), ttl: ttl, secure: secure, now: time.Now}
}

func (s *Service) Register(email, name, password string) (User, error) {
	email = strings.ToLower(strings.TrimSpace(email))
	name = strings.TrimSpace(name)
	if _, err := mail.ParseAddress(email); err != nil || len(name) < 2 || len(name) > 120 || len(password) < 12 {
		return User{}, ErrInvalidRegistration
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return User{}, err
	}

	var user User
	err = s.db.QueryRow(`INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3) RETURNING id, email, name`, email, name, string(hash)).Scan(&user.ID, &user.Email, &user.Name)
	if err != nil {
		if strings.Contains(err.Error(), "duplicate key") {
			return User{}, ErrEmailTaken
		}
		return User{}, err
	}
	return user, nil
}

func (s *Service) Login(email, password string) (User, error) {
	email = strings.ToLower(strings.TrimSpace(email))
	var user User
	var hash string
	err := s.db.QueryRow(`SELECT id, email, name, password_hash FROM users WHERE LOWER(email) = LOWER($1)`, email).Scan(&user.ID, &user.Email, &user.Name, &hash)
	if err == sql.ErrNoRows {
		return User{}, ErrInvalidCredentials
	}
	if err != nil {
		return User{}, err
	}
	if bcrypt.CompareHashAndPassword([]byte(hash), []byte(password)) != nil {
		return User{}, ErrInvalidCredentials
	}
	return user, nil
}

func (s *Service) Issue(user User) (string, time.Time, error) {
	now := s.now().UTC()
	expires := now.Add(s.ttl)
	payload, err := json.Marshal(claims{Subject: user.ID, Email: user.Email, Name: user.Name, Issuer: "zerra", Issued: now.Unix(), Expires: expires.Unix()})
	if err != nil {
		return "", time.Time{}, err
	}
	header := base64.RawURLEncoding.EncodeToString([]byte(`{"alg":"HS256","typ":"JWT"}`))
	body := base64.RawURLEncoding.EncodeToString(payload)
	signature := s.sign(header + "." + body)
	return header + "." + body + "." + signature, expires, nil
}

func (s *Service) Authenticate(token string) (User, error) {
	parts := strings.Split(token, ".")
	if len(parts) != 3 || !hmac.Equal([]byte(parts[2]), []byte(s.sign(parts[0]+"."+parts[1]))) {
		return User{}, ErrInvalidSession
	}
	payload, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return User{}, ErrInvalidSession
	}
	var value claims
	if json.Unmarshal(payload, &value) != nil || value.Issuer != "zerra" || value.Subject == "" || value.Expires <= s.now().UTC().Unix() {
		return User{}, ErrInvalidSession
	}
	return User{ID: value.Subject, Email: value.Email, Name: value.Name}, nil
}

func (s *Service) Cookie(token string, expires time.Time) *http.Cookie {
	return &http.Cookie{Name: CookieName, Value: token, Path: "/", Expires: expires, MaxAge: int(time.Until(expires).Seconds()), HttpOnly: true, Secure: s.secure, SameSite: http.SameSiteLaxMode}
}

func (s *Service) ExpiredCookie() *http.Cookie {
	return &http.Cookie{Name: CookieName, Value: "", Path: "/", Expires: time.Unix(0, 0), MaxAge: -1, HttpOnly: true, Secure: s.secure, SameSite: http.SameSiteLaxMode}
}

func (s *Service) sign(value string) string {
	mac := hmac.New(sha256.New, s.secret)
	_, _ = mac.Write([]byte(value))
	return base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
}
