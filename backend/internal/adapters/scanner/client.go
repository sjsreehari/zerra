package scanner

import (
 "errors"
 "github.com/docker/docker/client"
)
var ErrUnsafeTarget = errors.New("registered target URL is unsafe or invalid")
func NewDockerClient()(*client.Client,error){return client.NewClientWithOpts(client.FromEnv,client.WithAPIVersionNegotiation())}
