package subdomain

import "context"

type Service interface {
	CreateNewReverseProxy(ctx context.Context, req ExecuteInstanceRequest) (ReverseProxy, error)
}

type service struct {
	repo Repository
}

func NewService(repo Repository) Service {
	return &service{repo: repo}
}

func (s *service) CreateNewReverseProxy(ctx context.Context, req ExecuteInstanceRequest) (ReverseProxy, error) {
	proxy := ReverseProxy{
		Subdomain:  req.Subdomain,
		ApiBaseUrl: req.ApiBaseUrl,
	}

	return s.repo.CreateNewReverseProxy(ctx, proxy)
}
