package subdomain

import (
	"database/sql"

	"github.com/gin-gonic/gin"
)

type Router struct {
	db *sql.DB
}

func NewRouter(db *sql.DB) *Router {
	return &Router{
		db: db,
	}
}

func (rtr *Router) BasePath() string {
	return "/proxy"
}

func (rtr *Router) Register(rg *gin.RouterGroup) {

	repo := NewRepository(rtr.db)
	service := NewService(repo)
	handler := NewHandler(service)

	rg.POST("", handler.CreateNewReverseProxy)
}