package main

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	inferenceAdapter "github.com/sjsreehari/zerra/internal/adapters/inference"
	trafficlog "github.com/sjsreehari/zerra/internal/features/trafficlog"
	scannerAdapter "github.com/sjsreehari/zerra/internal/adapters/scanner"
	securityscanFeature "github.com/sjsreehari/zerra/internal/features/securityscan"
	proxyAdapter "github.com/sjsreehari/zerra/internal/adapters/proxy"
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

	// Dynamic subdomain proxying happens before route matching so a registered
	// host forwards every path, including paths such as / and /health.
	proxyService := proxyModule.NewService(proxyModule.NewRepository(app.db))
	inferenceURL := os.Getenv("SENTRA_INFERENCE_URL")
	inferenceEnabled := os.Getenv("SENTRA_INFERENCE_ENABLED") != "false"
	var inferenceClient *inferenceAdapter.Client
	if inferenceEnabled {
		if inferenceURL == "" {
			inferenceURL = "http://127.0.0.1:8000"
		}
		inferenceClient = inferenceAdapter.New(inferenceURL)
	}
	logRepository := trafficlog.Repository{DB: app.db}
	r.Use(func(c *gin.Context) {
		subdomain := proxyAdapter.SubdomainFromHost(c.Request.Host)
		if subdomain == "" {
			c.Next()
			return
		}

		route, err := proxyService.FindBySubdomain(c.Request.Context(), subdomain)
		if err == sql.ErrNoRows {
			c.AbortWithStatusJSON(http.StatusNotFound, gin.H{"error": "subdomain is not registered"})
			return
		}
		if err != nil {
			log.Printf("failed to resolve proxy route for %q: %v", subdomain, err)
			c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "failed to resolve upstream API"})
			return
		}

		if inferenceEnabled {
			event := inferenceClient.BuildEvent(c.Request, "")
			eventJSON, _ := json.Marshal(event)
			logID, logErr := logRepository.Create(c.Request.Context(), subdomain, c.ClientIP(), c.Request.Method, c.Request.URL.Path, c.Request.ContentLength, eventJSON)
			if logErr != nil {
				c.AbortWithStatusJSON(http.StatusServiceUnavailable, gin.H{"error": "traffic log unavailable"})
				return
			}
			event.ID = logID
			eventJSON, _ = json.Marshal(event)
			_ = logRepository.SetEvent(c.Request.Context(), logID, eventJSON)
			decision, err := inferenceClient.Evaluate(c.Request.Context(), event)
			if err != nil {
				log.Printf("inference unavailable for %q: %v", subdomain, err)
				_ = logRepository.Complete(c.Request.Context(), logID, nil, "block", http.StatusServiceUnavailable, err.Error())
				c.AbortWithStatusJSON(http.StatusServiceUnavailable, gin.H{"error": "security inference unavailable"})
				return
			}
			if decision.Verdict != "allow" {
				status := http.StatusForbidden
				if decision.Verdict == "step_up" {
					status = http.StatusUnauthorized
				}
				_ = logRepository.Complete(c.Request.Context(), logID, decision.Raw, decision.Verdict, status, "")
				c.AbortWithStatusJSON(status, gin.H{"verdict": decision.Verdict, "reason": decision.Reason, "log_id": logID})
				return
			}
			c.Set("traffic_log_id", logID)
			c.Set("agent_output", decision)
		}

		if err := proxyAdapter.Forward(c, route.ApiBaseUrl); err != nil {
			log.Printf("invalid upstream for %q: %v", subdomain, err)
			c.AbortWithStatusJSON(http.StatusBadGateway, gin.H{"error": "registered upstream API is invalid"})
			return
		}
		if logID, ok := c.Get("traffic_log_id"); ok {
			decision := c.MustGet("agent_output").(inferenceAdapter.Decision)
			_ = logRepository.Complete(c.Request.Context(), logID.(string), decision.Raw, decision.Verdict, http.StatusOK, "")
		}
		c.Abort()
	})

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

	api := r.Group("/api/v1")
	// Targets are resolved only through the proxy table. The scanner runner has
	// no client-controlled image, command, mount, headers, or target URL.
	var runner securityscanFeature.Runner
	dockerClient, err := scannerAdapter.NewDockerClient()
	if err != nil {
		runner = securityscanFeature.UnavailableRunner{Err: err}
	} else {
		runner = scannerAdapter.NewDockerRunner(dockerClient)
	}
	scanService := securityscanFeature.NewService(
		securityscanFeature.PostgresRepository{DB: app.db}, scannerAdapter.NewTargetGuard(), runner,
		securityscanFeature.DefaultLimits(), os.Getenv("SAFE_ACTIVE_SCANS_ENABLED") == "true",
	)
	securityscanFeature.Register(api.Group("/security-scans"), securityscanFeature.NewHandler(scanService))

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
