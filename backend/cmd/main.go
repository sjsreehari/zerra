package main

import (
	// "fmt"
	"log"
	"os"
	"time"

	//"time"

	// "github.com/DeveloperAromal/iPROMS/internal/scheduler"
	// "github.com/DeveloperAromal/iPROMS/pkg/banner"
	// "github.com/DeveloperAromal/iPROMS/pkg/logger"
	"github.com/joho/godotenv"
	_ "github.com/lib/pq"

	databseAdapter "github.com/sjsreehari/zerra/internal/adapters/postgresql"
	"github.com/sjsreehari/zerra/pkg/logger"
	// "github.com/DeveloperAromal/iPROMS/internal/scheduler"
	// authMiddleware "github.com/DeveloperAromal/iPROMS/internal/features/auth/middleware"
	// encryptionPkg "github.com/DeveloperAromal/iPROMS/pkg/encryption"
)

func main() {

	// APP BANNER
	// banner.Banner()

	err := godotenv.Load("../.env", ".env")
	if err != nil {
		log.Println("no local .env loaded; using process environment")
	}
	startTime = time.Now()

	cfg := config{
		addr: ":8080",
		db: dbConfig{
			dsn: os.Getenv("DB_CONN_STR"),
		},
	}
	// Logger
	logger := logger.New(logger.INIT)

	// DATABASE CONNECTION

	conn := databseAdapter.PostgresConnection(cfg.db.dsn)

	// WARNING:
	// 		Uncomment this in production
	//		USE:
	//			This ping /health endpoint in each 10 minutes to avoid render cooldown
	// go func() {
	// 	ticker := time.NewTicker(5 * time.Minute)

	// 	for range ticker.C {
	// 		err := scheduler.PingHost(os.Getenv("PROD_HEATH_ENDPOINT"))
	// 		if err != nil {
	// 			logger.Error(fmt.Sprintf("Ping failed: %v", err))
	// 		} else {
	// 			logger.Success("Ping success")
	// 		}
	// 	}
	// }()

	api := application{
		config: cfg,
		db:     conn,
	}

	if err := api.run(api.mount()); err != nil {
		logger.Fatal("server failed to start")
		os.Exit(1)
	}

}
