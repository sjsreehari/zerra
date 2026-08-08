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

func (h *Handler) ListAllReverseProxies(c *gin.Context) {
	list, err := h.svc.FindAll(c.Request.Context())
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
		"message": "Subdomains fetched successfully",
		"data": list,
	})
}
