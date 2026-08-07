package sandbox

type ExecuteRequest struct {
	Image   string
	Command []string
	Binds   []string
}
