package postgresql

import (
	"database/sql"
	"fmt"
	"os"

	"github.com/sjsreehari/zerra/pkg/logger"
	_ "github.com/lib/pq"
)

func PostgresConnection(connStr string) *sql.DB {
	logger := logger.New(logger.DEBUG)

	conn, err := sql.Open("postgres", connStr)
	if err != nil {
		panic(err)
	}

	if err := conn.Ping(); err != nil {
		logger.Error(fmt.Sprintf("database not reachable: %s", connStr))
		os.Exit(1)
	}
	logger.Success(fmt.Sprintf("connected to database: %s", connStr))

	return conn
}
