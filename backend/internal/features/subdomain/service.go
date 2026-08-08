package subdomain

import (
	"context"
)

type Service interface {
	CreateNewReverseProxy(ctx context.Context, req ExecuteInstanceRequest) (ReverseProxy, error)
	FindBySubdomain(ctx context.Context, subdomain string) (ReverseProxy, error)
	FindAll(ctx context.Context) ([]ReverseProxy, error)
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

	return registered, nil
}

func (s *service) FindBySubdomain(ctx context.Context, subdomain string) (ReverseProxy, error) {
	return s.repo.FindBySubdomain(ctx, subdomain)
}

func (s *service) FindAll(ctx context.Context) ([]ReverseProxy, error) {
	return s.repo.FindAll(ctx)
}
