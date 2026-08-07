package main

import (
	"context"
	"database/sql"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	proxyadapter "github.com/sjsreehari/zerra/internal/adapters/proxy"
	containerModule "github.com/sjsreehari/zerra/internal/features/container"
	proxyModule "github.com/sjsreehari/zerra/internal/features/subdomain"
	routers "github.com/sjsreehari/zerra/internal/interfaces"
)

var startTime time.Time

type application struct {
	config config
	db     *sql.DB
}

type config struct {
	addr string
	db   dbConfig
}

type dbConfig struct {
	dsn string
}

type databaseResolver struct {
	db *sql.DB
}

func (r databaseResolver) ResolveReverseProxy(ctx context.Context, subdomain string) (string, error) {
	svc := proxyModule.NewService(proxyModule.NewRepository(r.db))
	proxy, err := svc.ResolveReverseProxy(ctx, subdomain)
	if err != nil {
		return "", err
	}
	return proxy.ApiBaseUrl, nil
}

func (app *application) mount() http.Handler {

	if os.Getenv("ENVIRONMENT") == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	r := gin.Default()

	// MIDDLEWARE
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:3000"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	r.GET("/", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status": "active",
		})
	})

	// Health endpoint returns the current status of the server,
	// including uptime, timestamp, environment, and version.
	r.GET("/health", func(c *gin.Context) {
		uptime := time.Since(startTime)

		c.JSON(http.StatusOK, gin.H{
			"status":    "active",
			"timestamp": time.Now().UTC(),
			"uptime": gin.H{
				"seconds": int(uptime.Seconds()),
				"human":   uptime.String(),
			},
			"env":     "development",
			"version": "1.0.0",
		})
	})

	proxyadapter.DefaultRegistry.SetResolver(databaseResolver{db: app.db})
	r.Use(proxyadapter.DefaultRegistry.Handler())

	api := r.Group("/api/v1")

	modules := []routers.RouterInterface{
		containerModule.NewRouter(app.db),
		proxyModule.NewRouter(app.db),
	}

	for _, m := range modules {
		group := api.Group(m.BasePath())

		m.Register(group)
	}

	return r

}

func (app *application) run(h http.Handler) error {
	srv := &http.Server{
		Addr:         app.config.addr,
		Handler:      h,
		WriteTimeout: 120 * time.Second,
		ReadTimeout:  120 * time.Second,
		IdleTimeout:  120 * time.Second,
	}

	log.Printf("server has started at %s", app.config.addr)

	return srv.ListenAndServe()
}
