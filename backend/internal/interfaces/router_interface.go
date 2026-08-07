package interfaces

import "github.com/gin-gonic/gin"

type RouterInterface interface {
	BasePath() string
	Register(reg *gin.RouterGroup)
}