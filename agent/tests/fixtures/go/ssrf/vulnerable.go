package ssrf

import "net/http"

func handler(w http.ResponseWriter, r *http.Request) {
	url := r.URL.Query().Get("url")
	resp, _ := http.Get(url)
	_ = resp
}
