package subdomain

import (
	"context"
	"database/sql"
)

type Repository interface {
	CreateNewReverseProxy(ctx context.Context, proxy ReverseProxy) (ReverseProxy, error)
	GetReverseProxyBySubdomain(ctx context.Context, subdomain string) (ReverseProxy, error)
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

func (r *repository) GetReverseProxyBySubdomain(ctx context.Context, subdomain string) (ReverseProxy, error) {
	query := `
		SELECT id, subdomain, api_base_url
		FROM proxy
		WHERE subdomain = $1
		LIMIT 1
	`

	var proxy ReverseProxy
	err := r.db.QueryRowContext(ctx, query, subdomain).Scan(&proxy.ID, &proxy.Subdomain, &proxy.ApiBaseUrl)
	if err != nil {
		if err == sql.ErrNoRows {
			return ReverseProxy{}, nil
		}
		return ReverseProxy{}, err
	}

	return proxy, nil
}
