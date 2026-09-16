import { createHash } from "node:crypto";
import type { NormalizedFinding } from "@zerra/schema";

const PATTERNS = [
  { id: "github-token", title: "GitHub token", re: /(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})/g },
  { id: "aws-access-key", title: "AWS access key", re: /AKIA[0-9A-Z]{16}/g },
  { id: "private-key", title: "Private key material", re: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g },
  { id: "generic-secret", title: "Likely hard-coded secret", re: /(?:api[_-]?key|secret|password|token)\s*[:=]\s*["']([A-Za-z0-9+/_=-]{16,})["']/gi }
];
function entropy(s: string) { const counts = new Map<string, number>(); for (const c of s) counts.set(c, (counts.get(c) ?? 0) + 1); return [...counts.values()].reduce((n, count) => { const p = count / s.length; return n - p * Math.log2(p); }, 0); }
function allowed(value: string) { return /^[0-9a-f]{32,64}$/i.test(value) || /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value) || (value.length > 256 && /^[A-Za-z0-9+/=]+$/.test(value)); }
export function scanSecrets(path: string, content: string): NormalizedFinding[] {
  const findings: NormalizedFinding[] = [];
  for (const p of PATTERNS) for (const match of content.matchAll(p.re)) {
    const value = match[1] ?? match[0]; if (allowed(value) || (p.id === "generic-secret" && entropy(value) < 3.4)) continue;
    const line = content.slice(0, match.index).split("\n").length;
    findings.push({ fingerprint: createHash("sha256").update(`${p.id}:${path}:${match.index}`).digest("hex"), kind: "SECRET", ruleId: p.id, title: p.title, description: "Credential-like material is committed in source control.", severity: "HIGH", cvss: 7.5, path, line, evidence: "[REDACTED]", reachable: true, reasoning: ["Matched a credential signature", "Value passed entropy and allowlist checks"] });
  }
  return findings;
}
