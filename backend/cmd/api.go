package main

import (
    "database/sql"
    "log"
    "net/http"
    "os"
    "time"

    "github.com/gin-contrib/cors"
    "github.com/gin-gonic/gin"
    inferenceAdapter "github.com/sjsreehari/zerra/internal/adapters/inference"
    proxyAdapter "github.com/sjsreehari/zerra/internal/adapters/proxy"
    securityscanFeature "github.com/sjsreehari/zerra/internal/features/securityscan"
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

    // CORS — allow both local dev and deployed Vercel frontend
    allowedOrigins := []string{
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    }
    if vercelURL := os.Getenv("VERCEL_FRONTEND_URL"); vercelURL != "" {
        allowedOrigins = append(allowedOrigins, vercelURL)
    }
    // Also allow the deployed Zerra frontend
    allowedOrigins = append(allowedOrigins,
        "https://zerra.vercel.app",
        "https://zerra-*.vercel.app",
    )

    r.Use(cors.New(cors.Config{
        AllowOrigins:     allowedOrigins,
        AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
        AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
        ExposeHeaders:    []string{"Content-Length"},
        AllowCredentials: true,
        MaxAge:           12 * time.Hour,
    }))

    // Dynamic subdomain proxying happens before route matching so a registered
    // host forwards every path, including paths such as / and /health.
    proxyService := proxyModule.NewService(proxyModule.NewRepository(app.db))
    inferenceURL := os.Getenv("ZERRA_INFERENCE_URL")
    if inferenceURL == "" {
        inferenceURL = "http://127.0.0.1:8000"
    }
    inferenceClient := inferenceAdapter.New(inferenceURL)

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

        // Zero-Trust inference evaluation
        if os.Getenv("SKIP_INFERENCE") != "true" {
            _ = inferenceClient
            log.Printf("inference evaluation pending for %q (feature in development)", subdomain)
        } else {
            log.Printf("skipping inference for %q (dev mode)", subdomain)
        }

        if err := proxyAdapter.Forward(c, route.ApiBaseUrl); err != nil {
            log.Printf("invalid upstream for %q: %v", subdomain, err)
            c.AbortWithStatusJSON(http.StatusBadGateway, gin.H{"error": "registered upstream API is invalid"})
            return
        }
        c.Abort()
    })

    r.GET("/", func(c *gin.Context) {
        c.JSON(http.StatusOK, gin.H{
            "status":  "active",
            "service": "zerra-gateway",
        })
    })

    // Health endpoint
    r.GET("/health", func(c *gin.Context) {
        uptime := time.Since(startTime)
        c.JSON(http.StatusOK, gin.H{
            "status":    "active",
            "timestamp": time.Now().UTC(),
            "uptime": gin.H{
                "seconds": int(uptime.Seconds()),
                "human":   uptime.String(),
            },
            "env":     os.Getenv("ENVIRONMENT"),
            "version": "1.0.0",
        })
    })

    api := r.Group("/api/v1")

    // Security scan feature
    scanService := securityscanFeature.NewService(
        securityscanFeature.PostgresRepository{DB: app.db},
        securityscanFeature.NoopTargetGuard{},
        securityscanFeature.UnavailableRunner{},
        securityscanFeature.DefaultLimits(),
        os.Getenv("SAFE_ACTIVE_SCANS_ENABLED") == "true",
    )
    securityscanFeature.Register(api.Group("/security-scans"), securityscanFeature.NewHandler(scanService))

    // Feature modules
    modules := []routers.RouterInterface{
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

    log.Printf("Zerra Gateway started on %s", app.config.addr)

    return srv.ListenAndServe()
}