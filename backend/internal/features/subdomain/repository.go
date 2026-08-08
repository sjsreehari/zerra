package subdomain

import (
	"context"
	"database/sql"
)

type Repository interface {
	CreateNewReverseProxy(ctx context.Context, proxy ReverseProxy) (ReverseProxy, error)
	FindBySubdomain(ctx context.Context, subdomain string) (ReverseProxy, error)
	FindAll(ctx context.Context) ([]ReverseProxy, error)
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
// FindBySubdomain returns the upstream route registered for a tenant subdomain.
// Comparison is case-insensitive because DNS host names are case-insensitive.
func (r *repository) FindBySubdomain(ctx context.Context, subdomain string) (ReverseProxy, error) {
	const query = `
		SELECT id, subdomain, api_base_url
		FROM proxy
		WHERE LOWER(subdomain) = LOWER($1)
		LIMIT 1
	`

	var proxy ReverseProxy
	err := r.db.QueryRowContext(ctx, query, subdomain).Scan(
		&proxy.ID,
		&proxy.Subdomain,
		&proxy.ApiBaseUrl,
	)
	if err != nil {
		return ReverseProxy{}, err
	}

	return proxy, nil
}

func (r *repository) FindAll(ctx context.Context) ([]ReverseProxy, error) {
	const query = `
		SELECT id, subdomain, api_base_url
		FROM proxy
		ORDER BY id DESC
	`

	rows, err := r.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var proxies []ReverseProxy
	for rows.Next() {
		var p ReverseProxy
		if err := rows.Scan(&p.ID, &p.Subdomain, &p.ApiBaseUrl); err != nil {
			continue
		}
		proxies = append(proxies, p)
	}
	if proxies == nil {
		proxies = []ReverseProxy{}
	}

	return proxies, nil
}
