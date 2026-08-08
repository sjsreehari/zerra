package inference

import (
	"context"
	"fmt"
	"io"
	"net/http"
)

// ProxyGET forwards a GET request to the inference service and returns the raw body.
func (c *Client) ProxyGET(ctx context.Context, path string) ([]byte, int, error) {
	url := c.baseURL + path
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, 0, err
	}
	resp, err := c.http.Do(req)
	if err != nil {
		return nil, 0, fmt.Errorf("inference proxy GET %s: %w", path, err)
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)
	return body, resp.StatusCode, err
}

// ProxyPOST forwards a POST request with the given body to the inference service.
func (c *Client) ProxyPOST(ctx context.Context, path string, reqBody io.Reader) ([]byte, int, error) {
	url := c.baseURL + path
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, reqBody)
	if err != nil {
		return nil, 0, err
	}
	req.Header.Set("Content-Type", "application/json")
	resp, err := c.http.Do(req)
	if err != nil {
		return nil, 0, fmt.Errorf("inference proxy POST %s: %w", path, err)
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)
	return body, resp.StatusCode, err
}
