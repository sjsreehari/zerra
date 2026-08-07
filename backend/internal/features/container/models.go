package container

import "time"

type Status string

const (
	StatusPending Status = "pending"
	StatusRunning Status = "running"
	StatusSuccess Status = "success"
	StatusFailed  Status = "failed"
)

type ExecuteInstanceRequest struct {
	Image   string   `json:"image"`
	Command []string `json:"command"`
	Binds   []string `json:"binds"`
}

type Instance struct {
	Image     string    `json:"image"`
	Command   []string  `json:"command"`
	Output    string    `json:"output"`
	Status    Status    `json:"status"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}
