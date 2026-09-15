"""GitHub API client for Zerra.

Handles repo cloning, branch creation, file commits, PR creation,
SARIF upload, and PR commenting.
"""

from __future__ import annotations

import json
import logging
import urllib.request
import urllib.error
from base64 import b64encode
from typing import Any, Optional

logger = logging.getLogger(__name__)

_GITHUB_API = "https://api.github.com"


class GitHubClient:
    """Lightweight GitHub API client using only stdlib.

    Requires a personal access token (PAT) or GitHub App installation token.
    """

    def __init__(self, token: str) -> None:
        self._token = token
        self._headers = {
            "Authorization": f"Bearer {token}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "Zerra-Security-Scanner/1.0",
        }

    # ── Low-level helpers ────────────────────────────

    def _request(
        self,
        method: str,
        path: str,
        data: dict[str, Any] | None = None,
        *,
        raw_body: bytes | None = None,
        extra_headers: dict[str, str] | None = None,
    ) -> dict[str, Any] | list[Any]:
        """Make a GitHub API request."""
        url = f"{_GITHUB_API}{path}" if path.startswith("/") else path
        headers = {**self._headers, **(extra_headers or {})}
        body: bytes | None = None

        if raw_body is not None:
            body = raw_body
        elif data is not None:
            body = json.dumps(data).encode("utf-8")
            headers["Content-Type"] = "application/json"

        req = urllib.request.Request(url, data=body, headers=headers, method=method)

        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                resp_body = resp.read()
                if not resp_body:
                    return {}
                return json.loads(resp_body)
        except urllib.error.HTTPError as exc:
            error_body = exc.read().decode("utf-8", errors="ignore")
            logger.error("GitHub API %s %s → %d: %s", method, path, exc.code, error_body)
            raise RuntimeError(f"GitHub API error {exc.code}: {error_body}") from exc
        except urllib.error.URLError as exc:
            raise RuntimeError(f"GitHub API connection failed: {exc}") from exc

    def _get(self, path: str) -> Any:
        return self._request("GET", path)

    def _post(self, path: str, data: dict[str, Any]) -> Any:
        return self._request("POST", path, data)

    def _patch(self, path: str, data: dict[str, Any]) -> Any:
        return self._request("PATCH", path, data)

    # ── Repository operations ────────────────────────

    def get_repo(self, owner: str, repo: str) -> dict[str, Any]:
        """Fetch repository metadata."""
        return self._get(f"/repos/{owner}/{repo}")

    def get_default_branch(self, owner: str, repo: str) -> str:
        """Get the default branch name for a repo."""
        info = self.get_repo(owner, repo)
        return info.get("default_branch", "main")

    def get_latest_commit_sha(self, owner: str, repo: str, branch: str) -> str:
        """Get the SHA of the latest commit on a branch."""
        ref = self._get(f"/repos/{owner}/{repo}/git/ref/heads/{branch}")
        return ref["object"]["sha"]

    # ── Branch operations ────────────────────────────

    def create_branch(
        self,
        owner: str,
        repo: str,
        branch_name: str,
        from_sha: str,
    ) -> dict[str, Any]:
        """Create a new branch from a specific commit SHA."""
        return self._post(
            f"/repos/{owner}/{repo}/git/refs",
            {"ref": f"refs/heads/{branch_name}", "sha": from_sha},
        )

    def branch_exists(self, owner: str, repo: str, branch_name: str) -> bool:
        """Check if a branch exists."""
        try:
            self._get(f"/repos/{owner}/{repo}/git/ref/heads/{branch_name}")
            return True
        except RuntimeError:
            return False

    # ── File operations ──────────────────────────────

    def get_file_content(
        self, owner: str, repo: str, path: str, branch: str
    ) -> tuple[str, str]:
        """Get file content and its blob SHA.

        Returns (content, sha).
        """
        data = self._get(f"/repos/{owner}/{repo}/contents/{path}?ref={branch}")
        import base64
        content = base64.b64decode(data["content"]).decode("utf-8")
        return content, data["sha"]

    def create_or_update_file(
        self,
        owner: str,
        repo: str,
        path: str,
        content: str,
        message: str,
        branch: str,
        sha: str | None = None,
    ) -> dict[str, Any]:
        """Create or update a file in a branch."""
        payload: dict[str, Any] = {
            "message": message,
            "content": b64encode(content.encode("utf-8")).decode("ascii"),
            "branch": branch,
        }
        if sha:
            payload["sha"] = sha

        return self._request("PUT", f"/repos/{owner}/{repo}/contents/{path}", payload)

    # ── Pull Request operations ──────────────────────

    def create_pull_request(
        self,
        owner: str,
        repo: str,
        title: str,
        body: str,
        head_branch: str,
        base_branch: str,
    ) -> dict[str, Any]:
        """Create a pull request.

        Returns the PR data dict including 'number' and 'html_url'.
        """
        return self._post(
            f"/repos/{owner}/{repo}/pulls",
            {
                "title": title,
                "body": body,
                "head": head_branch,
                "base": base_branch,
            },
        )

    def comment_on_pr(
        self,
        owner: str,
        repo: str,
        pr_number: int,
        body: str,
    ) -> dict[str, Any]:
        """Add a comment to a PR."""
        return self._post(
            f"/repos/{owner}/{repo}/issues/{pr_number}/comments",
            {"body": body},
        )

    def comment_on_commit(
        self,
        owner: str,
        repo: str,
        commit_sha: str,
        body: str,
    ) -> dict[str, Any]:
        """Add a comment to a specific commit."""
        return self._post(
            f"/repos/{owner}/{repo}/commits/{commit_sha}/comments",
            {"body": body},
        )

    # ── SARIF upload ─────────────────────────────────

    def upload_sarif(
        self,
        owner: str,
        repo: str,
        commit_sha: str,
        ref: str,
        sarif_content: str,
    ) -> dict[str, Any]:
        """Upload a SARIF report to GitHub Code Scanning.

        The SARIF content must be gzip-compressed and base64-encoded.
        """
        import gzip
        compressed = gzip.compress(sarif_content.encode("utf-8"))
        encoded = b64encode(compressed).decode("ascii")

        return self._post(
            f"/repos/{owner}/{repo}/code-scanning/sarifs",
            {
                "commit_sha": commit_sha,
                "ref": ref,
                "sarif": encoded,
                "tool_name": "Zerra Security Scanner",
            },
        )

    # ── Webhook verification ─────────────────────────

    @staticmethod
    def verify_webhook_signature(
        payload_body: bytes,
        signature_header: str,
        webhook_secret: str,
    ) -> bool:
        """Verify a GitHub webhook HMAC-SHA256 signature."""
        import hmac
        import hashlib
        if not signature_header.startswith("sha256="):
            return False
        expected = hmac.new(
            webhook_secret.encode("utf-8"),
            payload_body,
            hashlib.sha256,
        ).hexdigest()
        return hmac.compare_digest(f"sha256={expected}", signature_header)

    # ── Convenience: create fix PR ───────────────────

    def create_fix_pr(
        self,
        owner: str,
        repo: str,
        finding_id: str,
        file_path: str,
        original_content: str,
        fixed_content: str,
        title: str,
        body: str,
        base_branch: str | None = None,
    ) -> dict[str, Any]:
        """End-to-end: create a branch, commit a fix, and open a PR.

        Returns the PR data dict.
        """
        if base_branch is None:
            base_branch = self.get_default_branch(owner, repo)

        # 1. Get base commit
        base_sha = self.get_latest_commit_sha(owner, repo, base_branch)

        # 2. Create fix branch
        branch_name = f"zerra/fix-{finding_id}"
        if self.branch_exists(owner, repo, branch_name):
            branch_name = f"zerra/fix-{finding_id}-{base_sha[:7]}"
        self.create_branch(owner, repo, branch_name, base_sha)

        # 3. Get current file SHA
        _, file_sha = self.get_file_content(owner, repo, file_path, base_branch)

        # 4. Commit the fix
        self.create_or_update_file(
            owner, repo, file_path, fixed_content,
            message=f"fix: {title}\n\nAutomated security fix by Zerra\nFinding: {finding_id}",
            branch=branch_name,
            sha=file_sha,
        )

        # 5. Open the PR
        pr = self.create_pull_request(
            owner, repo, title, body,
            head_branch=branch_name,
            base_branch=base_branch,
        )

        logger.info("Created fix PR #%s: %s", pr.get("number"), pr.get("html_url"))
        return pr
