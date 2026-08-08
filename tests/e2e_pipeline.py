"""Real HTTP test for the Compose stack; no mocks and no syntax-only assertions."""

from __future__ import annotations

import json
import time
from http.cookiejar import CookieJar
import urllib.error
import urllib.request

GATEWAY = "http://127.0.0.1:8080"
INFERENCE = "http://127.0.0.1:8000"
HOST = "qroasis.127.0.0.1.nip.io"
COOKIE_JAR = CookieJar()
OPENER = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(COOKIE_JAR))


def request(url: str, *, token: str | None = None, method: str = "GET", body: dict | None = None, host: str | None = None):
    headers = {}
    if host:
        headers["Host"] = host
    if token:
        headers["Authorization"] = f"Bearer {token}"
    payload = json.dumps(body).encode() if body else None
    if payload:
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=payload, headers=headers, method=method)
    try:
        with OPENER.open(req, timeout=10) as response:
            return response.status, json.loads(response.read())
    except urllib.error.HTTPError as error:
        return error.code, json.loads(error.read())


def wait_for_inference() -> None:
    for _ in range(30):
        try:
            status, _ = request(f"{INFERENCE}/health")
            if status == 200:
                return
        except OSError:
            time.sleep(1)
    raise RuntimeError("inference service did not become healthy")


def main() -> None:
    wait_for_inference()

    # A new user receives an HTTP-only JWT session cookie, which authorizes
    # management actions without exposing a token to JavaScript.
    status, payload = request(
        f"{GATEWAY}/api/v1/auth/register",
        method="POST",
        body={"name": "E2E Operator", "email": "e2e@example.test", "password": "correct-horse-battery-staple"},
    )
    assert status == 201 and payload["user"]["email"] == "e2e@example.test", (status, payload)
    status, payload = request(
        f"{GATEWAY}/api/v1/proxy",
        method="POST",
        body={"subdomain": "qroasis", "api_base_url": "http://upstream:8001"},
    )
    assert status == 200 and payload["success"], (status, payload)

    # Valid caller reaches the private upstream through the Go gateway.
    status, payload = request(f"{GATEWAY}/invoices/inv-a-001", token="demo-human-token", host=HOST)
    assert status == 200 and payload["id"] == "inv-a-001", (status, payload)

    # Valid attacker identity is blocked before the private upstream is reached.
    status, payload = request(f"{GATEWAY}/invoices/inv-b-001", token="demo-attacker-token", host=HOST)
    assert status == 403 and payload["verdict"] == "block", (status, payload)

    # Out-of-scope agent endpoint is blocked at the gateway.
    status, payload = request(f"{GATEWAY}/admin/export", token="demo-finance-agent-token", host=HOST)
    assert status == 403 and payload["verdict"] == "block", (status, payload)

    # Enumeration must eventually be detected and blocked while individual
    # requests remain routed through the real Go->Python->upstream path.
    blocked = False
    for number in range(1, 8):
        status, payload = request(f"{GATEWAY}/invoices/inv-a-{number:03d}", token="demo-attacker-token", host=HOST)
        if status in (401, 403):
            blocked = True
            break
    assert blocked, "enumeration was never blocked"

    status, metrics = request(f"{INFERENCE}/v1/metrics")
    assert status == 200 and metrics["requests_scored"] >= 4, metrics
    status, cards = request(f"{INFERENCE}/v1/risk-cards")
    assert status == 200 and cards and any(card["verdict"] == "block" for card in cards), cards
    print("E2E PASS: allow, cross-tenant block, scope block, enumeration block, metrics, and Risk Cards verified.")


if __name__ == "__main__":
    main()
