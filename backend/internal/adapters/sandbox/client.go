package sandbox

import "github.com/docker/docker/client"

func NewSandClient() (*client.Client, error) {
	return client.NewClientWithOpts(
		client.FromEnv,
		client.WithAPIVersionNegotiation(),
	)
}
