package securityscan

import (
	"database/sql"
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
)

var errUnsafeTarget = errors.New("registered target URL is unsafe or invalid")

type Handler struct{ service *Service }

func NewHandler(s *Service) *Handler { return &Handler{service: s} }

func (h *Handler) Create(c *gin.Context) {
	var req CreateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "subdomain is required"})
		return
	}

	job, err := h.service.Create(c.Request.Context(), req)
	if err != nil {
		switch {
		case errors.Is(err, ErrSubdomainNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		case errors.Is(err, errUnsafeTarget), errors.Is(err, ErrSafeActiveDisabled):
			c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		default:
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		}
		return
	}

	c.JSON(http.StatusAccepted, gin.H{"job_id": job.ID, "status": job.Status, "subdomain": job.Subdomain, "mode": job.Mode})
}

func (h *Handler) Get(c *gin.Context) {
	job, err := h.service.Get(c, c.Param("id"))
	if errors.Is(err, sql.ErrNoRows) {
		c.JSON(404, gin.H{"error": "scan not found"})
		return
	}
	if err != nil {
		c.JSON(500, gin.H{"error": "could not read scan"})
		return
	}
	c.JSON(200, job)
}

func (h *Handler) Findings(c *gin.Context) {
	fs, err := h.service.Findings(c, c.Param("id"))
	if err != nil {
		c.JSON(500, gin.H{"error": "could not read findings"})
		return
	}
	c.JSON(200, fs)
}

func (h *Handler) Cancel(c *gin.Context) {
	err := h.service.Cancel(c, c.Param("id"))
	if errors.Is(err, ErrCannotCancel) {
		c.JSON(409, gin.H{"error": err.Error()})
		return
	}
	if err != nil {
		c.JSON(404, gin.H{"error": "scan not found"})
		return
	}
	c.JSON(202, gin.H{"status": "cancellation requested"})
}

func (h *Handler) List(c *gin.Context) {
	subdomain := c.Query("subdomain")
	jobs, err := h.service.ListJobs(c, subdomain)
	if err != nil {
		c.JSON(500, gin.H{"error": "could not list scans"})
		return
	}
	if jobs == nil {
		jobs = []Job{}
	}
	c.JSON(200, jobs)
}
