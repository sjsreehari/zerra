package container

import (
	"context"
	"fmt"
	"time"

	"github.com/sjsreehari/zerra/internal/adapters/sandbox"
)

type Service interface {
	ExecuteInstance(ctx context.Context, req ExecuteInstanceRequest) (*Instance, error)
}

type service struct {
	repo Repository
}

func NewService(repo Repository) Service {
	return &service{repo: repo}
}

func (s *service) ExecuteInstance(ctx context.Context, req ExecuteInstanceRequest) (*Instance, error) {
	if len(req.Command) == 0 {
		return nil, fmt.Errorf("command is required")
	}

	instance := &Instance{
		Image:     req.Image,
		Command:   req.Command,
		Status:    StatusRunning,
		CreatedAt: time.Now().UTC(),
		UpdatedAt: time.Now().UTC(),
	}

	output, err := sandbox.Execute(sandbox.ExecuteRequest{
		Image:   req.Image,
		Command: req.Command,
		Binds:   req.Binds,
	})

	instance.Output = output
	instance.UpdatedAt = time.Now().UTC()

	if err != nil {
		instance.Status = StatusFailed
		_ = s.repo.SaveInstance(ctx, instance)
		return nil, fmt.Errorf("execution failed: %w", err)
	}

	instance.Status = StatusSuccess

	if err := s.repo.SaveInstance(ctx, instance); err != nil {
		return nil, fmt.Errorf("failed to save instance record: %w", err)
	}

	return instance, nil
}
