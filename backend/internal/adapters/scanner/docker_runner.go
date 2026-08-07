package scanner

import (
	"context"
	"encoding/json"
	"errors"
	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/api/types/strslice"
	"github.com/docker/docker/client"
	"github.com/docker/go-units"
	"github.com/sjsreehari/zerra/internal/features/securityscan"
	"io"
	"os"
	"time"
)

const maxOutput = 1 << 20

type DockerRunner struct {
	Client *client.Client
	Image  string
}

func NewDockerRunner(cli *client.Client) DockerRunner {
	image := os.Getenv("SENTRA_SCANNER_IMAGE")
	if image == "" {
		image = "sandbox:latest"
	}
	return DockerRunner{Client: cli, Image: image}
}

func (r DockerRunner) Run(ctx context.Context, plan securityscan.ScanPlan) (securityscan.ScanReport, error) {
	payload, err := json.Marshal(plan)
	if err != nil {
		return securityscan.ScanReport{}, err
	}

	if r.Client == nil {
		return securityscan.ScanReport{}, errors.New("docker client is not initialized")
	}

	timeoutCtx, cancel := context.WithTimeout(ctx, 60*time.Second)
	defer cancel()

	resp, err := r.Client.ContainerCreate(timeoutCtx, &container.Config{
		Image:        r.Image,
		Entrypoint:   strslice.StrSlice{"/bin/sh"},
		Cmd:          strslice.StrSlice{"-c", "echo scanner-not-available"},
		User:         "65532:65532",
		OpenStdin:    true,
		StdinOnce:    true,
		AttachStdin:  true,
		AttachStdout: true,
		AttachStderr: true,
		Tty:          false,
	}, &container.HostConfig{
		ReadonlyRootfs: true,
		Privileged:     false,
		AutoRemove:     false,
		Resources: container.Resources{
			Memory:    256 * units.MiB,
			PidsLimit: int64Ptr(64),
			NanoCPUs:  500000000,
		},
		SecurityOpt: []string{"no-new-privileges:true"},
		CapDrop:     []string{"ALL"},
	}, nil, nil, "")
	if err != nil {
		return securityscan.ScanReport{}, err
	}
	defer r.Client.ContainerRemove(context.Background(), resp.ID, container.RemoveOptions{Force: true})

	attach, err := r.Client.ContainerAttach(timeoutCtx, resp.ID, container.AttachOptions{Stream: true, Stdin: true, Stdout: true, Stderr: true})
	if err != nil {
		return securityscan.ScanReport{}, err
	}
	defer attach.Close()

	if err = r.Client.ContainerStart(timeoutCtx, resp.ID, container.StartOptions{}); err != nil {
		return securityscan.ScanReport{}, err
	}
	if _, err = attach.Conn.Write(append(payload, '\n')); err != nil {
		return securityscan.ScanReport{}, err
	}
	attach.CloseWrite()

	wait, errCh := r.Client.ContainerWait(timeoutCtx, resp.ID, container.WaitConditionNotRunning)
	select {
	case e := <-errCh:
		if e != nil {
			return securityscan.ScanReport{}, e
		}
	case <-wait:
	case <-timeoutCtx.Done():
		return securityscan.ScanReport{}, timeoutCtx.Err()
	}

	logs, err := r.Client.ContainerLogs(timeoutCtx, resp.ID, container.LogsOptions{ShowStdout: true, ShowStderr: true})
	if err != nil {
		return securityscan.ScanReport{}, err
	}
	defer logs.Close()

	out, err := io.ReadAll(io.LimitReader(logs, maxOutput+1))
	if err != nil {
		return securityscan.ScanReport{}, err
	}
	if len(out) > maxOutput {
		return securityscan.ScanReport{}, errors.New("scanner output exceeds limit")
	}

	if len(out) == 0 {
		return securityscan.ScanReport{}, errors.New("scanner container produced no output")
	}

	var report securityscan.ScanReport
	if err := json.Unmarshal(out, &report); err != nil {
		return securityscan.ScanReport{}, errors.New("scanner emitted invalid report")
	}
	return report, nil
}

func int64Ptr(v int64) *int64 { return &v }
