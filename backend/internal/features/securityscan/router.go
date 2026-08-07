package securityscan
import "github.com/gin-gonic/gin"
func Register(r *gin.RouterGroup,h *Handler){r.POST("",h.Create);r.GET("/:id",h.Get);r.GET("/:id/findings",h.Findings);r.POST("/:id/cancel",h.Cancel)}
