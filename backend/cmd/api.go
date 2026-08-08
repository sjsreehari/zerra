package main

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	inferenceAdapter "github.com/sjsreehari/zerra/internal/adapters/inference"
	authFeature "github.com/sjsreehari/zerra/internal/features/auth"
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
		AllowOrigins:     allowedOrigins(),
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
	if inferenceURL == "" {
		inferenceURL = "http://127.0.0.1:8000"
	}
	inferenceClient := inferenceAdapter.New(inferenceURL)
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
	authService := authFeature.NewService(app.db, os.Getenv("JWT_SECRET"), jwtTTL(), os.Getenv("ENVIRONMENT") == "production")
	authHandler := authFeature.NewHandler(authService)
	api.POST("/auth/register", authHandler.Register)
	api.POST("/auth/login", authHandler.Login)

	protected := api.Group("")
	protected.Use(authFeature.Require(authService))
	protected.GET("/auth/me", authHandler.Me)
	protected.POST("/auth/logout", authHandler.Logout)
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
	securityscanFeature.Register(protected.Group("/security-scans"), securityscanFeature.NewHandler(scanService))

	modules := []routers.RouterInterface{
		containerModule.NewRouter(app.db),
		proxyModule.NewRouter(app.db),
	}

	for _, m := range modules {
		group := protected.Group(m.BasePath())

		m.Register(group)
	}

	// ── Sentra security dashboard API routes ──
	if inferenceClient != nil {
		sentra := protected.Group("/sentra")

		// Proxy GET endpoints to inference service
		proxyGET := func(inferPath string) gin.HandlerFunc {
			return func(c *gin.Context) {
				body, status, err := inferenceClient.ProxyGET(c.Request.Context(), inferPath)
				if err != nil {
					c.JSON(http.StatusBadGateway, gin.H{"error": err.Error()})
					return
				}
				c.Data(status, "application/json", body)
			}
		}

		// Proxy POST endpoints to inference service (inline handlers used below)

		sentra.GET("/metrics", proxyGET("/v1/metrics"))
		sentra.GET("/risk-cards", proxyGET("/v1/risk-cards"))
		sentra.GET("/identities", proxyGET("/v1/identities"))
		sentra.GET("/ollama", proxyGET("/v1/llm/health"))
		sentra.GET("/policies", proxyGET("/v1/policies"))
		sentra.GET("/trust-scores", proxyGET("/v1/trust-scores"))
		sentra.GET("/attack-sim/scenarios", proxyGET("/v1/attack-sim/scenarios"))

		sentra.POST("/identities/:id/revoke", func(c *gin.Context) {
			path := "/v1/identities/" + c.Param("id") + "/revoke"
			body, status, err := inferenceClient.ProxyPOST(c.Request.Context(), path, nil)
			if err != nil {
				c.JSON(http.StatusBadGateway, gin.H{"error": err.Error()})
				return
			}
			c.Data(status, "application/json", body)
		})

		sentra.POST("/identities/:id/restore", func(c *gin.Context) {
			path := "/v1/identities/" + c.Param("id") + "/restore"
			body, status, err := inferenceClient.ProxyPOST(c.Request.Context(), path, nil)
			if err != nil {
				c.JSON(http.StatusBadGateway, gin.H{"error": err.Error()})
				return
			}
			c.Data(status, "application/json", body)
		})

		sentra.POST("/risk-cards/:id/investigate", func(c *gin.Context) {
			path := "/v1/risk-cards/" + c.Param("id") + "/investigate"
			body, status, err := inferenceClient.ProxyPOST(c.Request.Context(), path, c.Request.Body)
			if err != nil {
				c.JSON(http.StatusBadGateway, gin.H{"error": err.Error()})
				return
			}
			c.Data(status, "application/json", body)
		})

		sentra.POST("/risk-cards/:id/policy-recommendation", func(c *gin.Context) {
			path := "/v1/risk-cards/" + c.Param("id") + "/policy-recommendation"
			body, status, err := inferenceClient.ProxyPOST(c.Request.Context(), path, c.Request.Body)
			if err != nil {
				c.JSON(http.StatusBadGateway, gin.H{"error": err.Error()})
				return
			}
			c.Data(status, "application/json", body)
		})

		sentra.POST("/policy-recommendations/:id/approve", func(c *gin.Context) {
			path := "/v1/policy-recommendations/" + c.Param("id") + "/approve"
			body, status, err := inferenceClient.ProxyPOST(c.Request.Context(), path, c.Request.Body)
			if err != nil {
				c.JSON(http.StatusBadGateway, gin.H{"error": err.Error()})
				return
			}
			c.Data(status, "application/json", body)
		})

		sentra.GET("/risk-cards/:id/report", func(c *gin.Context) {
			path := "/v1/risk-cards/" + c.Param("id") + "/report"
			body, status, err := inferenceClient.ProxyGET(c.Request.Context(), path)
			if err != nil {
				c.JSON(http.StatusBadGateway, gin.H{"error": err.Error()})
				return
			}
			c.Data(status, "text/plain", body)
		})

		sentra.POST("/attack-sim/run", func(c *gin.Context) {
			scenarioID := c.DefaultQuery("scenario_id", "fast_enumeration")
			if scenarioID != "fast_enumeration" && scenarioID != "normal_traffic" {
				c.JSON(http.StatusBadRequest, gin.H{"error": "unknown simulation scenario"})
				return
			}
			path := "/v1/attack-sim/run?scenario_id=" + scenarioID
			body, status, err := inferenceClient.ProxyPOST(c.Request.Context(), path, nil)
			if err != nil {
				c.JSON(http.StatusBadGateway, gin.H{"error": err.Error()})
				return
			}
			c.Data(status, "application/json", body)
		})

		// Traffic logs from database
		sentra.GET("/logs", func(c *gin.Context) {
			rows, err := app.db.QueryContext(c.Request.Context(),
				`SELECT id, subdomain, source_ip, request_method, request_path, verdict, status, upstream_status, received_at, evaluated_at FROM "log" ORDER BY received_at DESC LIMIT 100`)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}
			defer rows.Close()
			var logs []map[string]any
			for rows.Next() {
				var id, subdomain, method, path, logStatus string
				var sourceIP, verdict sql.NullString
				var upstreamStatus sql.NullInt64
				var receivedAt time.Time
				var evaluatedAt sql.NullTime
				if err := rows.Scan(&id, &subdomain, &sourceIP, &method, &path, &verdict, &logStatus, &upstreamStatus, &receivedAt, &evaluatedAt); err != nil {
					continue
				}
				entry := map[string]any{
					"id": id, "subdomain": subdomain, "source_ip": sourceIP.String,
					"method": method, "path": path, "verdict": verdict.String,
					"status": logStatus, "upstream_status": upstreamStatus.Int64,
					"received_at": receivedAt, "evaluated_at": evaluatedAt.Time,
				}
				logs = append(logs, entry)
			}
			if logs == nil {
				logs = []map[string]any{}
			}
			c.JSON(http.StatusOK, logs)
		})
	}

	return r

}

func allowedOrigins() []string {
	raw := os.Getenv("CORS_ORIGINS")
	if raw == "" {
		return []string{"http://localhost:3000", "http://127.0.0.1:3000"}
	}
	parts := strings.Split(raw, ",")
	origins := make([]string, 0, len(parts))
	for _, part := range parts {
		if origin := strings.TrimSpace(part); origin != "" {
			origins = append(origins, origin)
		}
	}
	return origins
}

func jwtTTL() time.Duration {
	hours, err := strconv.Atoi(os.Getenv("JWT_TTL_HOURS"))
	if err != nil || hours <= 0 || hours > 24*30 {
		hours = 24
	}
	return time.Duration(hours) * time.Hour
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
