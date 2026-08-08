package auth

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
)

type Handler struct {
	service *Service
}

type credentialsRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	Name     string `json:"name"`
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) Register(c *gin.Context) {
	var request credentialsRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "valid registration details are required"})
		return
	}
	user, err := h.service.Register(request.Email, request.Name, request.Password)
	if err != nil {
		handleAuthError(c, err)
		return
	}
	h.respondWithSession(c, user, http.StatusCreated)
}

func (h *Handler) Login(c *gin.Context) {
	var request credentialsRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "valid login details are required"})
		return
	}
	user, err := h.service.Login(request.Email, request.Password)
	if err != nil {
		handleAuthError(c, err)
		return
	}
	h.respondWithSession(c, user, http.StatusOK)
}

func (h *Handler) Logout(c *gin.Context) {
	http.SetCookie(c.Writer, h.service.ExpiredCookie())
	c.Status(http.StatusNoContent)
}

func (h *Handler) Me(c *gin.Context) {
	user, exists := CurrentUser(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "authentication required"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"user": user})
}

func (h *Handler) respondWithSession(c *gin.Context, user User, status int) {
	token, expires, err := h.service.Issue(user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not create session"})
		return
	}
	http.SetCookie(c.Writer, h.service.Cookie(token, expires))
	c.JSON(status, gin.H{"user": user, "expires_at": expires.UTC()})
}

func handleAuthError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, ErrInvalidRegistration):
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
	case errors.Is(err, ErrEmailTaken):
		c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
	case errors.Is(err, ErrInvalidCredentials):
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
	default:
		c.JSON(http.StatusInternalServerError, gin.H{"error": "authentication service unavailable"})
	}
}
