package subdomain

import (
	"context"

	proxyadapter "github.com/sjsreehari/zerra/internal/adapters/proxy"
)

type Service interface {
	CreateNewReverseProxy(ctx context.Context, req ExecuteInstanceRequest) (ReverseProxy, error)
	ResolveReverseProxy(ctx context.Context, subdomain string) (ReverseProxy, error)
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

	registered, err := s.repo.CreateNewReverseProxy(ctx, proxy)
	if err != nil {
		return ReverseProxy{}, err
	}

	if err := proxyadapter.RegisterRoute(registered.Subdomain, registered.ApiBaseUrl); err != nil {
		return ReverseProxy{}, err
	}

	return registered, nil
}

func (s *service) ResolveReverseProxy(ctx context.Context, subdomain string) (ReverseProxy, error) {
	return s.repo.GetReverseProxyBySubdomain(ctx, subdomain)
}
