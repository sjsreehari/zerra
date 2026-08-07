package sandbox

import (
	"context"
	"io"
	"time"

	"github.com/docker/docker/api/types/container"
	"github.com/docker/go-units"
)

func Execute(req ExecuteRequest) (string, error) {
	cli, err := NewSandClient()
	if err != nil {
		return "", err
	}

	ctx, cancel := context.WithTimeout(
		context.Background(),
		15*time.Second,
	)
	defer cancel()

	resp, err := cli.ContainerCreate(
		ctx,
		&container.Config{
			Image: "kprecon",
			Cmd:   req.Command,
			Tty:   false,
		},
		&container.HostConfig{
			Binds:          req.Binds,
			ReadonlyRootfs: true,
			Resources: container.Resources{
				Memory:    256 * units.MiB,
				PidsLimit: func(i int64) *int64 { return &i }(64),
			},
			NetworkMode: "bridge",
		},
		nil, nil, "",
	)
	if err != nil {
		return "", err
	}

	err = cli.ContainerStart(
		ctx,
		resp.ID,
		container.StartOptions{},
	)
	if err != nil {
		return "", err
	}

	statusCh, errCh := cli.ContainerWait(
		ctx,
		resp.ID,
		container.WaitConditionNotRunning,
	)

	select {
	case <-statusCh:

	case err := <-errCh:
		if err != nil {
			return "", err
		}
	}

	reader, err := cli.ContainerLogs(
		ctx,
		resp.ID,
		container.LogsOptions{
			ShowStdout: true,
			ShowStderr: true,
		},
	)
	if err != nil {
		return "", err
	}

	bytes, err := io.ReadAll(reader)
	if err != nil {
		return "", err
	}

	return string(bytes), nil
}
