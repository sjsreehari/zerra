package subdomain

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

type Handler struct {
	svc Service
}

func NewHandler(svc Service) *Handler {
	return &Handler{svc: svc}
}

func (h *Handler) CreateNewReverseProxy(c *gin.Context) {
	var req ExecuteInstanceRequest
	
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"status": 400,
			"message": "Invalid request",
			"data": nil,
		})
		return
	}

	domain, err := h.svc.CreateNewReverseProxy(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"status": 500,
			"message": "Internal Server error",
			"data": nil,
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"status": 200,
		"message": "Subdomain registered successfully",
		"data": domain,
	})
}

// ResolveSubdomain looks up a subdomain and returns its api_base_url for Nginx routing
func (h *Handler) ResolveSubdomain(c *gin.Context) {
	subdomain := c.Query("subdomain")
	if subdomain == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "subdomain query parameter required",
		})
		return
	}

	proxy, err := h.svc.FindBySubdomain(c.Request.Context(), subdomain)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"message": "Subdomain not found",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"subdomain": proxy.Subdomain,
		"api_base_url": proxy.ApiBaseUrl,
	})
}
