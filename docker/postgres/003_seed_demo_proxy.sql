INSERT INTO proxy (subdomain, api_base_url)
SELECT 'qroasis', 'http://upstream:8001'
WHERE NOT EXISTS (SELECT 1 FROM proxy WHERE subdomain = 'qroasis');
