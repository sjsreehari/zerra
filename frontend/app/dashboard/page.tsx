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

const GRADE_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  "A+": { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/30" },
  A: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/30" },
  B: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/30" },
  C: { bg: "bg-yellow-500/10", text: "text-yellow-400", border: "border-yellow-500/30" },
  D: { bg: "bg-orange-500/10", text: "text-orange-400", border: "border-orange-500/30" },
  F: { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/30" },
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
        fetch(`${APIENDPOINT.Findings}?limit=5`).then((r) => r.json()).catch(() => []),
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

  const grade = stats?.overall_grade || "A";
  const gradeStyle = GRADE_STYLES[grade] || GRADE_STYLES.A;

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      {/* Clean Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">
            Security Command Center
          </h1>
          <p className="text-xs text-text-muted mt-1">
            Real-time vulnerability telemetry and autonomous remediation status.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/dashboard/repositories"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs shadow-sm transition-all active:scale-[0.98]"
          >
            <Plus size={14} />
            <span>Connect Repo</span>
          </Link>
          <button
            onClick={loadData}
            title="Refresh Telemetry"
            className="p-2 rounded-xl bg-bg-surface border border-border-default hover:bg-bg-hover text-text-muted hover:text-text-primary transition-all"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* 4 Clean Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Security Grade */}
        <div className="rounded-xl border border-border-default bg-bg-surface p-4 space-y-1 shadow-sm">
          <div className="flex items-center justify-between text-xs text-text-muted">
            <span>Security Posture</span>
            <ShieldCheck size={14} className={gradeStyle.text} />
          </div>
          <div className={`text-2xl font-black ${gradeStyle.text}`}>
            {grade} Grade
          </div>
          <div className="text-[11px] text-text-muted">Weighted CVSS Score</div>
        </div>

        {/* Repositories */}
        <div className="rounded-xl border border-border-default bg-bg-surface p-4 space-y-1 shadow-sm">
          <div className="flex items-center justify-between text-xs text-text-muted">
            <span>Monitored Repos</span>
            <GitBranch size={14} className="text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-text-primary">
            {stats?.total_repos ?? repos.length}
          </div>
          <div className="text-[11px] text-emerald-400">Webhooks Connected</div>
        </div>

        {/* Total Scans */}
        <div className="rounded-xl border border-border-default bg-bg-surface p-4 space-y-1 shadow-sm">
          <div className="flex items-center justify-between text-xs text-text-muted">
            <span>Scans Run</span>
            <Search size={14} className="text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-text-primary">
            {stats?.total_scans ?? 0}
          </div>
          <div className="text-[11px] text-text-muted">SAST, SCA & Secrets</div>
        </div>

        {/* Critical & High Findings */}
        <div className="rounded-xl border border-border-default bg-bg-surface p-4 space-y-1 shadow-sm">
          <div className="flex items-center justify-between text-xs text-text-muted">
            <span>Open Issues</span>
            <ShieldAlert size={14} className="text-red-400" />
          </div>
          <div className="text-2xl font-bold text-red-400">
            {stats?.total_findings ?? 0}
          </div>
          <div className="text-[11px] text-text-muted">
            {stats?.total_critical ?? 0} Critical • {stats?.total_high ?? 0} High
          </div>
        </div>
      </div>

      {/* Alert Delivery Channels Status Line */}
      <div className="rounded-xl border border-border-default bg-bg-surface/50 px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-text-muted">
          <Bell size={13} className="text-blue-400" />
          <span>Incident Push Alerts:</span>
        </div>

        <div className="flex items-center gap-2 flex-wrap text-xs">
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-emerald-400">
            <MessageCircle size={12} /> WhatsApp
          </span>
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-indigo-400">
            <Zap size={12} /> Discord
          </span>
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-blue-400">
            <Users size={12} /> Teams
          </span>
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-purple-400">
            <Mail size={12} /> Email
          </span>
          <Link
            href="/dashboard/notifications"
            className="text-text-muted hover:text-text-primary ml-1 underline underline-offset-4 text-[11px]"
          >
            Configure Channels
          </Link>
        </div>
      </div>

      {/* Two Column Grid: Repositories & Priority Findings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Connected Repositories */}
        <div className="rounded-xl border border-border-default bg-bg-surface p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-semibold text-sm text-text-primary">
              <GitBranch size={15} className="text-blue-400" />
              <span>Repositories</span>
              <span className="text-xs text-text-muted font-normal">({repos.length})</span>
            </div>
            <Link
              href="/dashboard/repositories"
              className="text-xs text-blue-400 hover:text-blue-300 font-medium"
            >
              Manage →
            </Link>
          </div>

          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 size={20} className="animate-spin text-blue-400" />
            </div>
          ) : repos.length === 0 ? (
            <div className="text-center py-8 border border-dashed border-border-default rounded-lg">
              <p className="text-xs text-text-muted">No repositories registered yet.</p>
              <Link
                href="/dashboard/repositories"
                className="inline-flex items-center gap-1 mt-2 text-xs text-blue-400 hover:underline"
              >
                + Connect a repository
              </Link>
            </div>
          ) : (
            <div className="space-y-2.5">
              {repos.slice(0, 4).map((repo) => {
                const isScanning = scanningRepoId === repo.id;
                const rGrade = repo.last_scan?.security_score || "A";
                const rStyle = GRADE_STYLES[rGrade] || GRADE_STYLES.A;

                return (
                  <div
                    key={repo.id}
                    className="p-3 rounded-lg bg-bg-card border border-border-default hover:border-border-default/80 transition-all flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-text-primary truncate">
                          {getRepoName(repo.url)}
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white/5 text-text-muted">
                          {repo.branch}
                        </span>
                      </div>
                      <div className="text-[11px] text-text-muted mt-0.5">
                        {repo.last_scan
                          ? `${repo.last_scan.findings_count} findings • ${repo.last_scan.critical_count} critical`
                          : "Awaiting first scan"}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`w-6 h-6 rounded flex items-center justify-center font-bold text-xs border ${rStyle.bg} ${rStyle.text} ${rStyle.border}`}
                      >
                        {rGrade}
                      </span>
                      <button
                        onClick={() => triggerRepoScan(repo.id)}
                        disabled={isScanning}
                        title="Scan Now"
                        className="p-1.5 rounded bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 transition-all disabled:opacity-50"
                      >
                        {isScanning ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : (
                          <Play size={13} />
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Active Vulnerabilities & Auto-PR */}
        <div className="rounded-xl border border-border-default bg-bg-surface p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-semibold text-sm text-text-primary">
              <Bug size={15} className="text-red-400" />
              <span>Priority Findings</span>
              <span className="text-xs text-text-muted font-normal">
                ({criticalFindings.length})
              </span>
            </div>
            <Link
              href="/dashboard/findings"
              className="text-xs text-blue-400 hover:text-blue-300 font-medium"
            >
              Explorer →
            </Link>
          </div>

          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 size={20} className="animate-spin text-blue-400" />
            </div>
          ) : criticalFindings.length === 0 ? (
            <div className="text-center py-8 border border-dashed border-border-default rounded-lg">
              <ShieldCheck size={28} className="mx-auto text-emerald-400/40 mb-1" />
              <p className="text-xs text-text-muted">No open vulnerabilities detected.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {criticalFindings.slice(0, 4).map((f) => {
                const isPrDone = prCreated[f.id];
                const isPrLoading = prLoading === f.id;

                return (
                  <div
                    key={f.id}
                    className="p-3 rounded-lg bg-bg-card border border-border-default hover:border-border-default/80 transition-all flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase border ${
                            SEVERITY_BADGES[f.severity] || SEVERITY_BADGES.medium
                          }`}
                        >
                          {f.severity}
                        </span>
                        <span className="font-medium text-xs text-text-primary truncate">
                          {f.title}
                        </span>
                      </div>
                      <div className="text-[11px] text-text-muted font-mono mt-0.5 truncate">
                        {f.file_path ? `${f.file_path}:${f.line_start}` : getRepoName(f.repo_url)}
                      </div>
                    </div>

                    <div className="shrink-0">
                      {f.fix_suggestion ? (
                        <button
                          onClick={() => createPR(f.id)}
                          disabled={isPrLoading || !!isPrDone}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-semibold transition-all flex items-center gap-1 shadow-sm disabled:opacity-60"
                        >
                          {isPrLoading ? (
                            <Loader2 size={11} className="animate-spin" />
                          ) : isPrDone ? (
                            <CheckCircle2 size={11} />
                          ) : null}
                          <span>{isPrDone ? "PR Sent" : "Fix PR 🚀"}</span>
                        </button>
                      ) : (
                        <span className="text-[10px] text-text-muted font-mono">Manual Review</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}