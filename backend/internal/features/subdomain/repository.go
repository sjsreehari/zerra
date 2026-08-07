package subdomain

import (
	"context"
	"database/sql"
)

type Repository interface {
	CreateNewReverseProxy(ctx context.Context, proxy ReverseProxy) (ReverseProxy, error)
}

type repository struct {
	db *sql.DB
}

func NewRepository(db *sql.DB) Repository {
	return &repository{db: db}
}

func (r *repository) CreateNewReverseProxy(ctx context.Context, proxy ReverseProxy) (ReverseProxy, error) {
	query := `
		INSERT INTO proxy (subdomain, api_base_url)
		VALUES ($1, $2)
		RETURNING id
	`

	row := r.db.QueryRowContext(ctx, query, proxy.Subdomain, proxy.ApiBaseUrl)
	if err := row.Scan(&proxy.ID); err != nil {
		return ReverseProxy{}, err
	}

	return proxy, nil
}
