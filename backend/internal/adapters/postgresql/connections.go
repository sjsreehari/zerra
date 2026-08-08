package postgresql

import (
	"database/sql"
	"fmt"

	"github.com/sjsreehari/zerra/pkg/logger"
	_ "github.com/lib/pq"
)

func PostgresConnection(connStr string) (*sql.DB, error) {
	logger := logger.New(logger.DEBUG)

	conn, err := sql.Open("postgres", connStr)
	if err != nil {
		return nil, fmt.Errorf("failed to open postgres connection: %w", err)
	}

	if err := conn.Ping(); err != nil {
		logger.Error(fmt.Sprintf("database not reachable: %s", connStr))
		return nil, fmt.Errorf("database not reachable: %w", err)
	}
	logger.Success(fmt.Sprintf("connected to database: %s", connStr))

	return conn, nil
}
