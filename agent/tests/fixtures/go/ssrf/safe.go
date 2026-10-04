package ssrf

import "net/http"

func fetchBackend() {
	const backendURL = "https://internal.service/api"
	resp, _ := http.Get(backendURL)
	_ = resp
}
