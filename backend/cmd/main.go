package main

import (
	"log"
	"os"
	"time"

	"github.com/joho/godotenv"
	_ "github.com/lib/pq"

	databseAdapter "github.com/sjsreehari/zerra/internal/adapters/postgresql"
	"github.com/sjsreehari/zerra/pkg/logger"
)

func main() {
	err := godotenv.Load("../.env", ".env")
	if err != nil {
		log.Println("no local .env loaded; using process environment")
	}
	startTime = time.Now()
	if len(os.Getenv("JWT_SECRET")) < 32 {
		log.Println("JWT_SECRET missing or < 32 chars; using local development default secret")
		os.Setenv("JWT_SECRET", "zerra_default_local_development_jwt_secret_32chars_minimum!")
	}

	cfg := config{
		addr: ":8080",
		db: dbConfig{
			dsn: os.Getenv("DB_CONN_STR"),
		},
	}
	// Logger
	logger := logger.New(logger.INIT)

	// DATABASE CONNECTION
	conn, err := databseAdapter.PostgresConnection(cfg.db.dsn)
	if err != nil {
		logger.Error("database connection failed: " + err.Error())
		os.Exit(1)
	}

	api := application{
		config: cfg,
		db:     conn,
	}

	if err := api.run(api.mount()); err != nil {
		logger.Fatal("server failed to start")
		os.Exit(1)
	}
}
