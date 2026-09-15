"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { APIENDPOINT } from "@/config/Backend";
import {
  ShieldAlert,
  ShieldCheck,
  Zap,
  Play,
  ArrowRight,
  Activity,
  AlertTriangle,
  GitBranch,
  Search,
  Bug,
  Bell,
  MessageCircle,
  Mail,
  Users,
  CheckCircle2,
  ExternalLink,
  Clock,
  Loader2,
  Plus,
  RefreshCw,
  Terminal,
  Code2,
  Lock,
} from "lucide-react";

interface DashboardStats {
  total_repos: number;
  total_scans: number;
  total_findings: number;
  total_critical: number;
  total_high: number;
  total_medium?: number;
  total_low?: number;
  overall_grade: string;
  active_channels: string[];
  recent_scans: Array<{
    id: string;
    repo_url: string;
    grade: string;
    findings: number;
    completed_at: string | null;
  }>;
}

interface RepoItem {
  id: string;
  url: string;
  branch: string;
  auto_scan: boolean;
  scan_mode: string;
  status: string;
  last_scan?: {
    id: string;
    security_score: string;
    findings_count: number;
    critical_count: number;
    high_count: number;
    completed_at: string | null;
  };
}

interface FindingItem {
  id: string;
  title: string;
  description: string;
  severity: string;
  vulnerability_type: string;
  file_path: string | null;
  line_start: number | null;
  repo_url: string;
  fix_suggestion?: {
    file_path: string;
    explanation: string;
    original_code: string;
    fixed_code: string;
  } | null;
}

const GRADE_STYLES: Record<string, { bg: string; text: string; border: string; glow: string }> = {
  "A+": { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/30", glow: "shadow-emerald-500/20" },
  A: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/30", glow: "shadow-emerald-500/20" },
  B: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/30", glow: "shadow-blue-500/20" },
  C: { bg: "bg-yellow-500/10", text: "text-yellow-400", border: "border-yellow-500/30", glow: "shadow-yellow-500/20" },
  D: { bg: "bg-orange-500/10", text: "text-orange-400", border: "border-orange-500/30", glow: "shadow-orange-500/20" },
  F: { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/30", glow: "shadow-red-500/20" },
};

const SEVERITY_BADGES: Record<string, string> = {
  critical: "bg-red-500/10 text-red-400 border-red-500/20",
  high: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  medium: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  low: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
};

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [repos, setRepos] = useState<RepoItem[]>([]);
  const [criticalFindings, setCriticalFindings] = useState<FindingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanningRepoId, setScanningRepoId] = useState<string | null>(null);
  const [prCreated, setPrCreated] = useState<Record<string, string>>({});
  const [prLoading, setPrLoading] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [statsRes, reposRes, findingsRes] = await Promise.all([
        fetch(APIENDPOINT.DashboardStats).then((r) => r.json()).catch(() => null),
        fetch(APIENDPOINT.Repos).then((r) => r.json()).catch(() => []),
        fetch(`${APIENDPOINT.Findings}?limit=4`).then((r) => r.json()).catch(() => []),
      ]);

      if (statsRes) setStats(statsRes);
      if (Array.isArray(reposRes)) setRepos(reposRes);
      if (Array.isArray(findingsRes)) setCriticalFindings(findingsRes);
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const triggerRepoScan = async (repoId: string) => {
    setScanningRepoId(repoId);
    try {
      await fetch(APIENDPOINT.RepoScan(repoId), { method: "POST" });
      await loadData();
    } catch (e) {
      console.error(e);
    } finally {
      setScanningRepoId(null);
    }
  };

  const createPR = async (findingId: string) => {
    setPrLoading(findingId);
    try {
      const res = await fetch(APIENDPOINT.FindingCreatePR(findingId), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      setPrCreated((prev) => ({
        ...prev,
        [findingId]: data.pr_url || data.branch || "PR Generated",
      }));
    } catch {
      setPrCreated((prev) => ({ ...prev, [findingId]: "Error" }));
    } finally {
      setPrLoading(null);
    }
  };

  const getRepoName = (url: string) =>
    url.replace(/\.git$/, "").split("/").slice(-2).join("/");

  const gradeStyle = GRADE_STYLES[stats?.overall_grade || "A"] || GRADE_STYLES["B"];

  return (
    <div className="space-y-6 pb-12">
      {/* Top Welcome / Unified Autonomous Security Command Center */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-blue-950/40 via-zinc-900 to-black/80 p-6 md:p-8 backdrop-blur-xl shadow-lg">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-semibold tracking-wider uppercase text-blue-400">
                Autonomous Security Platform
              </span>
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              Repository Security & Auto-PR Defense
            </h1>
            <p className="text-sm text-text-secondary leading-relaxed">
              Zerra continuously monitors your Git repositories on every commit and pull request.
              Vulnerabilities in code, dependencies, and secrets are instantly detected, remediated via automated PRs, and dispatched across WhatsApp, Discord, Teams, and Email.
            </p>
          </div>

          {/* Quick CTAs */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Link
              href="/dashboard/repositories"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-md hover:shadow-blue-500/20 transition-all active:scale-[0.98]"
            >
              <Plus size={16} />
              <span>Connect Repository</span>
            </Link>
            <Link
              href="/dashboard/scans"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-bg-surface border border-border-default hover:bg-bg-hover text-text-primary text-sm font-medium transition-all"
            >
              <Search size={15} className="text-blue-400" />
              <span>Scan Timeline</span>
            </Link>
            <button
              onClick={loadData}
              title="Refresh Dashboard"
              className="p-2.5 rounded-xl bg-bg-surface border border-border-default hover:bg-bg-hover text-text-muted hover:text-text-primary transition-all"
            >
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {/* Real-time Posture Metrics */}
        <div className="mt-8 pt-6 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="flex items-center justify-between text-xs text-text-secondary mb-1">
              <span>Security Posture</span>
              <ShieldCheck size={14} className="text-emerald-400" />
            </div>
            <div className={`text-2xl font-black ${gradeStyle.text}`}>
              {stats?.overall_grade || "A"} Grade
            </div>
            <div className="text-[11px] text-text-muted mt-1">Autonomous CVSS Score</div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="flex items-center justify-between text-xs text-text-secondary mb-1">
              <span>Monitored Repos</span>
              <GitBranch size={14} className="text-blue-400" />
            </div>
            <div className="text-2xl font-bold text-white">
              {stats?.total_repos ?? repos.length} Repos
            </div>
            <div className="text-[11px] text-text-muted mt-1">GitHub Webhooks Active</div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="flex items-center justify-between text-xs text-text-secondary mb-1">
              <span>Total Scans Run</span>
              <Activity size={14} className="text-amber-400" />
            </div>
            <div className="text-2xl font-bold text-amber-300">
              {stats?.total_scans ?? 0} Runs
            </div>
            <div className="text-[11px] text-text-muted mt-1">SAST + SCA + Secrets</div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="flex items-center justify-between text-xs text-text-secondary mb-1">
              <span>Critical / High Issues</span>
              <ShieldAlert size={14} className="text-red-400" />
            </div>
            <div className="text-2xl font-bold text-red-400">
              {(stats?.total_critical ?? 0) + (stats?.total_high ?? 0)}
            </div>
            <div className="text-[11px] text-text-muted mt-1">
              {stats?.total_critical ?? 0} Crit • {stats?.total_high ?? 0} High
            </div>
          </div>
        </div>
      </div>

      {/* Multi-Channel Alerts Bar */}
      <div className="rounded-2xl border border-border-default bg-bg-surface p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Bell size={18} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-text-primary">
                Multi-Channel Real-time Notification Engine
              </h3>
              <p className="text-xs text-text-muted">
                Pushing critical security alerts on push/PR events to your team's incident channels
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
              <MessageCircle size={13} /> WhatsApp
            </span>
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-medium">
              <Zap size={13} /> Discord
            </span>
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium">
              <Users size={13} /> Teams
            </span>
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-medium">
              <Mail size={13} /> Email
            </span>
            <Link
              href="/dashboard/notifications"
              className="text-xs text-blue-400 hover:text-blue-300 font-medium ml-2 underline underline-offset-4"
            >
              Configure →
            </Link>
          </div>
        </div>
      </div>

      {/* Two Column Grid: Monitored Repositories & Critical Findings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monitored Repositories */}
        <div className="rounded-2xl border border-border-default bg-bg-surface p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <GitBranch size={16} className="text-blue-400" />
                <h3 className="text-base font-semibold text-text-primary">Connected Repositories</h3>
              </div>
              <Link
                href="/dashboard/repositories"
                className="text-xs text-blue-400 hover:text-blue-300 font-medium"
              >
                View all ({repos.length}) →
              </Link>
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 size={24} className="animate-spin text-blue-400" />
              </div>
            ) : repos.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-border-default rounded-xl p-6">
                <GitBranch size={36} className="mx-auto text-text-muted/40 mb-2" />
                <p className="text-sm font-medium text-text-primary">No repositories connected</p>
                <p className="text-xs text-text-muted mt-1">
                  Connect a repository to enable auto-scanning and automated fix PRs.
                </p>
                <Link
                  href="/dashboard/repositories"
                  className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition-all"
                >
                  <Plus size={14} /> Connect First Repo
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {repos.slice(0, 3).map((repo) => {
                  const isScanning = scanningRepoId === repo.id;
                  const grade = repo.last_scan?.security_score || "A";
                  const gStyle = GRADE_STYLES[grade] || GRADE_STYLES.A;

                  return (
                    <div
                      key={repo.id}
                      className="p-3.5 rounded-xl bg-bg-card border border-border-default hover:border-border-default/80 transition-all flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-text-primary truncate">
                            {getRepoName(repo.url)}
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 border border-white/10 text-text-muted">
                            {repo.branch}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-[11px] text-text-muted">
                          <span>
                            {repo.last_scan
                              ? `${repo.last_scan.findings_count} findings (${repo.last_scan.critical_count} crit)`
                              : "Pending scan"}
                          </span>
                          <span>•</span>
                          <span className="capitalize">{repo.scan_mode} mode</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs border ${gStyle.bg} ${gStyle.text} ${gStyle.border}`}
                        >
                          {grade}
                        </span>
                        <button
                          onClick={() => triggerRepoScan(repo.id)}
                          disabled={isScanning}
                          title="Trigger Scan"
                          className="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 transition-all disabled:opacity-50"
                        >
                          {isScanning ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Play size={14} />
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-border-default flex items-center justify-between text-xs text-text-muted">
            <span>Webhook: <code className="text-blue-400 font-mono">/v1/webhooks/github</code></span>
            <Link href="/dashboard/repositories" className="text-blue-400 hover:underline">
              Add Repo +
            </Link>
          </div>
        </div>

        {/* Priority Findings & Auto-PR Actions */}
        <div className="rounded-2xl border border-border-default bg-bg-surface p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Bug size={16} className="text-red-400" />
                <h3 className="text-base font-semibold text-text-primary">Priority Findings</h3>
              </div>
              <Link
                href="/dashboard/findings"
                className="text-xs text-blue-400 hover:text-blue-300 font-medium"
              >
                View all ({stats?.total_findings ?? criticalFindings.length}) →
              </Link>
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 size={24} className="animate-spin text-blue-400" />
              </div>
            ) : criticalFindings.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-border-default rounded-xl p-6">
                <ShieldCheck size={36} className="mx-auto text-emerald-400/40 mb-2" />
                <p className="text-sm font-medium text-text-primary">No vulnerabilities detected</p>
                <p className="text-xs text-text-muted mt-1">
                  Your repositories are secure. All security checks passed.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {criticalFindings.slice(0, 3).map((f) => {
                  const isPrDone = prCreated[f.id];
                  const isPrLoading = prLoading === f.id;

                  return (
                    <div
                      key={f.id}
                      className="p-3.5 rounded-xl bg-bg-card border border-border-default hover:border-border-default/80 transition-all space-y-2"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase border ${
                                SEVERITY_BADGES[f.severity] || SEVERITY_BADGES.medium
                              }`}
                            >
                              {f.severity}
                            </span>
                            <span className="font-medium text-xs text-text-primary truncate">
                              {f.title}
                            </span>
                          </div>
                          <div className="text-[11px] text-text-muted mt-1 font-mono truncate">
                            {f.file_path ? `${f.file_path}:${f.line_start}` : getRepoName(f.repo_url)}
                          </div>
                        </div>

                        {f.fix_suggestion && (
                          <button
                            onClick={() => createPR(f.id)}
                            disabled={isPrLoading || !!isPrDone}
                            className="shrink-0 px-2.5 py-1 bg-emerald-600/90 hover:bg-emerald-500 text-white rounded-md text-[11px] font-semibold transition-all flex items-center gap-1 shadow-sm disabled:opacity-60"
                          >
                            {isPrLoading ? (
                              <Loader2 size={11} className="animate-spin" />
                            ) : isPrDone ? (
                              <CheckCircle2 size={11} />
                            ) : null}
                            <span>{isPrDone ? "PR Sent" : "Fix PR 🚀"}</span>
                          </button>
                        )}
                      </div>

                      {isPrDone && (
                        <div className="p-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded text-[10px] text-emerald-300">
                          Branch created: <code className="font-mono">zerra/fix-{f.id.slice(0, 8)}</code>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-border-default flex items-center justify-between text-xs text-text-muted">
            <span>Automated patch generation enabled</span>
            <Link href="/dashboard/findings" className="text-blue-400 hover:underline">
              Inspect Code →
            </Link>
          </div>
        </div>
      </div>

      {/* Autonomous Continuous Defense Pipeline */}
      <div className="rounded-2xl border border-border-default bg-bg-surface p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="text-base font-semibold text-text-primary flex items-center gap-2">
              <Zap size={16} className="text-amber-400" />
              Continuous Git Security Engine
            </h3>
            <p className="text-xs text-text-muted mt-0.5">
              How Zerra autonomously guards code from commit to production
            </p>
          </div>
          <span className="text-xs font-mono bg-blue-500/10 text-blue-400 px-2.5 py-1 rounded-md border border-blue-500/20">
            Autonomous Cycle: ~15s
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
          <div className="p-4 rounded-xl bg-bg-card border border-border-default space-y-2">
            <div className="flex items-center gap-2 text-blue-400 font-semibold text-xs">
              <GitBranch size={14} /> 1. Git Push / Webhook
            </div>
            <p className="text-xs text-text-muted">
              Webhook triggers on commit or PR. Clones repo snapshot and detects language ecosystem.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-bg-card border border-border-default space-y-2">
            <div className="flex items-center gap-2 text-indigo-400 font-semibold text-xs">
              <Search size={14} /> 2. Triple Analysis
            </div>
            <p className="text-xs text-text-muted">
              Simultaneous AST static analysis, dependency CVE scanning (SCA), and 25+ secret pattern matchers.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-bg-card border border-border-default space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs">
              <Code2 size={14} /> 3. Automated Fix PR
            </div>
            <p className="text-xs text-text-muted">
              Creates isolated branch with verified code replacement patch and opens GitHub Pull Request.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-bg-card border border-border-default space-y-2">
            <div className="flex items-center gap-2 text-purple-400 font-semibold text-xs">
              <Bell size={14} /> 4. Instant Dispatch
            </div>
            <p className="text-xs text-text-muted">
              Critical CVSS findings pushed via WhatsApp template, Discord webhook, MS Teams card, and Email.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}