export type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";
export type FindingKind = "SAST" | "SCA" | "SECRET" | "IAC";
export type FindingStatus = "OPEN" | "FIXED" | "IGNORED" | "NEEDS_HUMAN";

export interface NormalizedFinding {
  fingerprint: string; kind: FindingKind; ruleId: string; title: string;
  description: string; severity: Severity; cvss: number; path: string;
  line: number; endLine?: number; evidence?: string; remediation?: string;
  reachable: boolean; reasoning: string[];
}

export interface ScanJob { repoId: string; installationId: string; pullNumber: number; baseSha: string; headSha: string; repository: string; }
export interface ApiScan { id: string; status: string; startedAt: string; completedAt?: string; findingCount: number; }
