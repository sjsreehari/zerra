package subdomain


type ExecuteInstanceRequest struct {
	Subdomain  string `json:"subdomain"`
	ApiBaseUrl string `json:"api_base_url"`
}

type ReverseProxy struct {
	ID         string `json:"id" db:"id"`
	Subdomain  string `json:"subdomain" db:"subdomain"`
	ApiBaseUrl string `json:"api_base_url" db:"api_base_url"`
}