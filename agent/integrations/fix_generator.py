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

    Currently uses pattern-based fixes. Can be extended to use LLM
    for more sophisticated fix generation.
    """
    if not finding.file_path or not finding.code_snippet:
        return None

    rule_id = finding.rule_id or ""
    snippet = finding.code_snippet

    # ── SQL Injection fixes ──────────────────────────
    if "sql-injection-fstring" in rule_id:
        return _fix_sql_injection_fstring(finding, snippet)

    if "sql-injection-format" in rule_id:
        return _fix_sql_injection_format(finding, snippet)

    # ── Command Injection fixes ─────────────────────
    if "command-injection-os" in rule_id:
        return _fix_command_injection_os(finding, snippet)

    if "command-injection-subprocess-shell" in rule_id:
        return _fix_subprocess_shell(finding, snippet)

    # ── Eval fixes ──────────────────────────────────
    if "eval-usage" in rule_id and "python" in rule_id:
        return _fix_python_eval(finding, snippet)

    # ── Weak hash fixes ─────────────────────────────
    if "weak-hash-md5" in rule_id:
        return _fix_weak_hash(finding, snippet, "md5", "sha256")

    if "weak-hash-sha1" in rule_id:
        return _fix_weak_hash(finding, snippet, "sha1", "sha256")

    # ── Pickle fix ──────────────────────────────────
    if "pickle-load" in rule_id:
        return _fix_pickle(finding, snippet)

    # ── Debug mode fix ──────────────────────────────
    if "debug-mode" in rule_id:
        return _fix_debug_mode(finding, snippet)

    # ── XSS innerHTML fix ───────────────────────────
    if "xss-innerhtml" in rule_id:
        return _fix_innerhtml(finding, snippet)

    # ── Insecure TLS fix ────────────────────────────
    if "insecure-tls" in rule_id:
        return _fix_insecure_tls(finding, snippet)

    # ── CORS wildcard fix ───────────────────────────
    if "cors-wildcard" in rule_id:
        return _fix_cors_wildcard(finding, snippet)

    # ── SCA: dependency upgrade fix ─────────────────
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
