package auth

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

const userContextKey = "authenticated_user"

func Require(service *Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		cookie, err := c.Request.Cookie(CookieName)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "authentication required"})
			return
		}
		user, err := service.Authenticate(cookie.Value)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid or expired session"})
			return
		}
		c.Set(userContextKey, user)
		c.Next()
	}
}

func CurrentUser(c *gin.Context) (User, bool) {
	value, exists := c.Get(userContextKey)
	if !exists {
		return User{}, false
	}
	user, valid := value.(User)
	return user, valid
}
