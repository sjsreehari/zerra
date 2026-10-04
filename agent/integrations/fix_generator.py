"""Fix suggestion generator for Zerra.

Takes a Finding with code context and generates a fix suggestion
(original → fixed code) using pattern-based rules or AI.
"""

from __future__ import annotations

import re
from typing import Optional

from agent.scanner.models import Finding, FixSuggestion, VulnerabilityType


def generate_fix(finding: Finding, file_content: str | None = None) -> Optional[FixSuggestion]:
    """Generate a fix suggestion for a finding.

    Dispatch order:
      1. Exact rule_id prefix match (legacy)
      2. CWE-based match
      3. Code snippet pattern match
      4. Title/description keyword match
    """
    if not finding.file_path or not finding.code_snippet:
        return None

    rule_id = (finding.rule_id or "").lower()
    snippet = finding.code_snippet
    cwe = (finding.cwe_id or "").upper()
    title = (finding.title or "").lower()
    desc = (finding.description or "").lower()

    # ── 1. Rule ID dispatch ───────────────────────────────────────────────────
    if "sql-injection-fstring" in rule_id or "sql-injection-concat" in rule_id:
        return _fix_sql_injection_fstring(finding, snippet)
    if "sql-injection-format" in rule_id:
        return _fix_sql_injection_format(finding, snippet)
    if "sql-injection" in rule_id and "sql" in snippet.lower():
        return _fix_sql_injection_fstring(finding, snippet)
    if "command-injection-os" in rule_id:
        return _fix_command_injection_os(finding, snippet)
    if "command-injection-subprocess-shell" in rule_id or "subprocess-shell" in rule_id:
        return _fix_subprocess_shell(finding, snippet)
    if "command-injection" in rule_id and ("shell=True" in snippet or "os.system" in snippet):
        return _fix_subprocess_shell(finding, snippet)

    if "go-ssrf-http-user-controlled-url" in rule_id:
        return _fix_go_ssrf(finding, snippet)

    # ── Eval fixes ──────────────────────────────────
    if "eval-usage" in rule_id and "python" in rule_id:
        return _fix_python_eval(finding, snippet)
    if "weak-hash-md5" in rule_id or ("weak-hash" in rule_id and "md5" in snippet.lower()):
        return _fix_weak_hash(finding, snippet, "md5", "sha256")
    if "weak-hash-sha1" in rule_id or ("weak-hash" in rule_id and "sha1" in snippet.lower()):
        return _fix_weak_hash(finding, snippet, "sha1", "sha256")
    if "pickle-load" in rule_id or "pickle" in rule_id:
        return _fix_pickle(finding, snippet)
    if "debug-mode" in rule_id:
        return _fix_debug_mode(finding, snippet)
    if "xss-innerhtml" in rule_id:
        return _fix_innerhtml(finding, snippet)
    if "insecure-tls" in rule_id:
        return _fix_insecure_tls(finding, snippet)
    if "cors-wildcard" in rule_id:
        return _fix_cors_wildcard(finding, snippet)

    # ── 2. CWE-based dispatch ─────────────────────────────────────────────────
    if cwe == "CWE-89":  # SQL Injection
        return _fix_sql_injection_fstring(finding, snippet)
    if cwe == "CWE-78":  # OS Command Injection
        return _fix_subprocess_shell(finding, snippet)
    if cwe == "CWE-77":  # Command Injection generic
        return _fix_subprocess_shell(finding, snippet)
    if cwe in ("CWE-326", "CWE-327", "CWE-328"):  # Weak Crypto / Hash
        if "md5" in snippet.lower():
            return _fix_weak_hash(finding, snippet, "md5", "sha256")
        if "sha1" in snippet.lower() or "sha-1" in snippet.lower():
            return _fix_weak_hash(finding, snippet, "sha1", "sha256")
    if cwe == "CWE-502":  # Unsafe Deserialization
        if "pickle" in snippet.lower():
            return _fix_pickle(finding, snippet)
    if cwe == "CWE-94":   # Code Injection (eval)
        return _fix_python_eval(finding, snippet)
    if cwe == "CWE-79":   # XSS
        if "innerhtml" in snippet.lower():
            return _fix_innerhtml(finding, snippet)

    # ── 3. Code snippet pattern dispatch ─────────────────────────────────────
    # SQL injection via string concatenation or format
    if re.search(r'["\'].*SELECT.*["\'].*\+|execute\s*\(\s*["\'].*%|f["\'].*SELECT', snippet, re.I):
        return _fix_sql_injection_fstring(finding, snippet)
    # Subprocess shell=True
    if re.search(r'shell\s*=\s*True|os\.system\s*\(|popen\s*\(', snippet, re.I):
        return _fix_subprocess_shell(finding, snippet)
    # MD5
    if re.search(r'hashlib\.md5|MD5\(|createHash\([\'"]md5', snippet, re.I):
        return _fix_weak_hash(finding, snippet, "md5", "sha256")
    # SHA1
    if re.search(r'hashlib\.sha1|SHA1\(|createHash\([\'"]sha1', snippet, re.I):
        return _fix_weak_hash(finding, snippet, "sha1", "sha256")
    # pickle.loads
    if re.search(r'pickle\.loads?\s*\(', snippet, re.I):
        return _fix_pickle(finding, snippet)
    # eval()
    if re.search(r'\beval\s*\(', snippet):
        return _fix_python_eval(finding, snippet)

    # ── 4. Title/description keyword dispatch ─────────────────────────────────
    if "sql injection" in title or "sql injection" in desc:
        return _fix_sql_injection_fstring(finding, snippet)
    if "command injection" in title or "os command" in title:
        return _fix_subprocess_shell(finding, snippet)
    if "md5" in title or "weak hash" in title or "weak cryptographic" in title:
        return _fix_weak_hash(finding, snippet, "md5", "sha256")
    if "sha1" in title:
        return _fix_weak_hash(finding, snippet, "sha1", "sha256")
    if "pickle" in title or "deserialization" in title:
        return _fix_pickle(finding, snippet)
    if "eval" in title and "unsafe" in title:
        return _fix_python_eval(finding, snippet)
    if "debug mode" in title:
        return _fix_debug_mode(finding, snippet)

    # ── 5. SCA: dependency upgrade ────────────────────────────────────────────
    if finding.vulnerability_type == VulnerabilityType.SCA and finding.fixed_version:
        return _fix_dependency_upgrade(finding)

    return None



# ── Fix generators ──────────────────────────────────

def _fix_sql_injection_fstring(finding: Finding, snippet: str) -> FixSuggestion:
    return FixSuggestion(
        file_path=finding.file_path or "",
        original_code=snippet,
        fixed_code=re.sub(
            r'execute\s*\(\s*f"([^"]*)"',
            r'execute("SELECT * FROM table WHERE id = %s", (value,))',
            snippet,
        ),
        explanation="Replace f-string SQL with parameterized query to prevent SQL injection. "
                    "Pass user values as a tuple in the second argument to execute().",
    )


def _fix_sql_injection_format(finding: Finding, snippet: str) -> FixSuggestion:
    return FixSuggestion(
        file_path=finding.file_path or "",
        original_code=snippet,
        fixed_code="# Use parameterized queries instead of .format()\n"
                   "cursor.execute('SELECT * FROM table WHERE id = %s', (user_input,))",
        explanation="Replace str.format() SQL construction with parameterized queries.",
    )


def _fix_command_injection_os(finding: Finding, snippet: str) -> FixSuggestion:
    fixed = snippet.replace("os.system(", "subprocess.run(")
    fixed = fixed.replace("os.popen(", "subprocess.run(")
    return FixSuggestion(
        file_path=finding.file_path or "",
        original_code=snippet,
        fixed_code=f"import subprocess\n{fixed}",
        explanation="Replace os.system()/os.popen() with subprocess.run() using shell=False "
                    "and an argument list to prevent command injection.",
    )


def _fix_subprocess_shell(finding: Finding, snippet: str) -> FixSuggestion:
    return FixSuggestion(
        file_path=finding.file_path or "",
        original_code=snippet,
        fixed_code=snippet.replace("shell=True", "shell=False"),
        explanation="Set shell=False to prevent shell injection. "
                    "Pass the command as a list of arguments instead of a string.",
    )


def _fix_go_ssrf(finding: Finding, snippet: str) -> FixSuggestion:
    return FixSuggestion(
        file_path=finding.file_path or "",
        original_code=snippet,
        fixed_code="validatedURL, err := validateOutboundURL(url)\n"
                   "if err != nil {\n\treturn err\n}\n"
                   "resp, err := http.Get(validatedURL)",
        explanation=(
            "Do not send the supplied URL directly. Implement validateOutboundURL to "
            "allow only expected schemes and hosts, resolve all A/AAAA records, and "
            "reject loopback, private, link-local, multicast, unspecified, and other "
            "disallowed IP ranges. Pin the connection to a validated address to limit "
            "DNS rebinding, and revalidate every redirect (or disable redirects)."
        ),
    )


def _fix_python_eval(finding: Finding, snippet: str) -> FixSuggestion:
    return FixSuggestion(
        file_path=finding.file_path or "",
        original_code=snippet,
        fixed_code=snippet.replace("eval(", "ast.literal_eval("),
        explanation="Replace eval() with ast.literal_eval() which safely evaluates "
                    "Python literal expressions (strings, numbers, lists, dicts) "
                    "without executing arbitrary code.",
    )


def _fix_weak_hash(
    finding: Finding, snippet: str, old_algo: str, new_algo: str
) -> FixSuggestion:
    return FixSuggestion(
        file_path=finding.file_path or "",
        original_code=snippet,
        fixed_code=snippet.replace(old_algo, new_algo),
        explanation=f"Replace {old_algo.upper()} with {new_algo.upper()} which is "
                    f"cryptographically secure and not vulnerable to collision attacks.",
    )


def _fix_pickle(finding: Finding, snippet: str) -> FixSuggestion:
    return FixSuggestion(
        file_path=finding.file_path or "",
        original_code=snippet,
        fixed_code=snippet.replace("pickle.load", "json.load").replace(
            "pickle.loads", "json.loads"
        ),
        explanation="Replace pickle with JSON for data serialization. "
                    "pickle can execute arbitrary code during deserialization.",
    )


def _fix_debug_mode(finding: Finding, snippet: str) -> FixSuggestion:
    fixed = snippet.replace("debug=True", 'debug=os.environ.get("DEBUG", "false").lower() == "true"')
    return FixSuggestion(
        file_path=finding.file_path or "",
        original_code=snippet,
        fixed_code=fixed,
        explanation="Use an environment variable to control debug mode instead of hardcoding True.",
    )


def _fix_innerhtml(finding: Finding, snippet: str) -> FixSuggestion:
    return FixSuggestion(
        file_path=finding.file_path or "",
        original_code=snippet,
        fixed_code=snippet.replace(".innerHTML", ".textContent"),
        explanation="Replace innerHTML with textContent to prevent XSS. "
                    "If HTML rendering is needed, use DOMPurify to sanitize first.",
    )


def _fix_insecure_tls(finding: Finding, snippet: str) -> FixSuggestion:
    return FixSuggestion(
        file_path=finding.file_path or "",
        original_code=snippet,
        fixed_code=snippet.replace("InsecureSkipVerify: true", "InsecureSkipVerify: false"),
        explanation="Re-enable TLS certificate verification to prevent man-in-the-middle attacks.",
    )


def _fix_cors_wildcard(finding: Finding, snippet: str) -> FixSuggestion:
    return FixSuggestion(
        file_path=finding.file_path or "",
        original_code=snippet,
        fixed_code=snippet.replace('"*"', '"https://your-domain.com"').replace(
            "'*'", "'https://your-domain.com'"
        ),
        explanation="Replace wildcard CORS origin with specific trusted domains.",
    )


def _fix_dependency_upgrade(finding: Finding) -> FixSuggestion:
    return FixSuggestion(
        file_path=finding.file_path or "",
        original_code=f"{finding.package_name}: {finding.package_version}",
        fixed_code=f"{finding.package_name}: {finding.fixed_version}",
        explanation=f"Upgrade {finding.package_name} from {finding.package_version} "
                    f"to {finding.fixed_version} to fix {finding.cve_id or finding.title}.",
    )


def generate_pr_body(findings: list[Finding]) -> str:
    """Generate a professional PR description for a batch of fixes."""
    lines = [
        "## 🔒 Zerra Security Fix",
        "",
        "This PR was automatically generated by [Zerra](https://github.com/sjsreehari/zerra) "
        "to remediate security vulnerabilities detected during a scan.",
        "",
        "### Findings Fixed",
        "",
        "| Severity | Finding | CWE | File |",
        "|----------|---------|-----|------|",
    ]

    for f in findings:
        severity_badge = {
            "critical": "🔴 CRITICAL",
            "high": "🟠 HIGH",
            "medium": "🟡 MEDIUM",
            "low": "🟢 LOW",
            "info": "🔵 INFO",
        }.get(f.severity.value, f.severity.value)

        lines.append(
            f"| {severity_badge} | {f.title} | {f.cwe_id or 'N/A'} | `{f.file_path}` |"
        )

    lines.extend([
        "",
        "### What was changed",
        "",
    ])

    for f in findings:
        if f.fix_suggestion:
            lines.extend([
                f"#### {f.title}",
                f"**File:** `{f.file_path}`",
                f"**Explanation:** {f.fix_suggestion.explanation}",
                "",
            ])

    lines.extend([
        "---",
        "",
        "*This PR was generated by Zerra Security Scanner. "
        "Please review the changes before merging.*",
    ])

    return "\n".join(lines)
