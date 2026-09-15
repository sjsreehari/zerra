"use client";

import React, { useState, useEffect } from "react";
import { APIENDPOINT } from "@/config/Backend";
import {
  Search,
  Clock,
  Download,
  ChevronRight,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Filter,
  GitBranch,
} from "lucide-react";

interface Scan {
  id: string;
  repo_url: string;
  branch: string;
  status: string;
  security_score: string;
  findings_count: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  started_at: string | null;
  completed_at: string | null;
  duration_seconds: number | null;
  languages: string[];
}

const STATUS_ICONS: Record<string, React.ReactNode> = {
  completed: <CheckCircle2 size={14} className="text-emerald-400" />,
  failed: <XCircle size={14} className="text-red-400" />,
  running: <Loader2 size={14} className="text-blue-400 animate-spin" />,
  queued: <Clock size={14} className="text-yellow-400" />,
};

const GRADE_COLORS: Record<string, string> = {
  "A+": "text-emerald-400 bg-emerald-500/10",
  A: "text-emerald-400 bg-emerald-500/10",
  B: "text-blue-400 bg-blue-500/10",
  C: "text-yellow-400 bg-yellow-500/10",
  D: "text-orange-400 bg-orange-500/10",
  F: "text-red-400 bg-red-500/10",
};

export default function ScansPage() {
  const [scans, setScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedScan, setSelectedScan] = useState<string | null>(null);
  const [findings, setFindings] = useState<any[]>([]);

  useEffect(() => {
    fetchScans();
  }, []);

  const fetchScans = async () => {
    try {
      const res = await fetch(APIENDPOINT.Scans);
      if (res.ok) setScans(await res.json());
    } catch {}
    setLoading(false);
  };

  const viewFindings = async (scanId: string) => {
    if (selectedScan === scanId) {
      setSelectedScan(null);
      return;
    }
    setSelectedScan(scanId);
    try {
      const res = await fetch(APIENDPOINT.ScanFindings(scanId));
      if (res.ok) setFindings(await res.json());
    } catch {
      setFindings([]);
    }
  };

  const downloadSarif = async (scanId: string) => {
    try {
      const res = await fetch(APIENDPOINT.ScanSarif(scanId));
      if (res.ok) {
        const data = await res.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `zerra-scan-${scanId}.sarif`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch {}
  };

  const getRepoName = (url: string) => url.replace(/\.git$/, "").split("/").slice(-2).join("/");

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleString("en-US", {
      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    });
  };

  const SEVERITY_BADGE: Record<string, string> = {
    critical: "bg-red-500/10 text-red-400 border-red-500/20",
    high: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    medium: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    low: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    info: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  };

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Scan History</h1>
        <p className="text-sm text-text-muted mt-1">
          View all security scans across your repositories.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-blue-400" />
        </div>
      ) : scans.length === 0 ? (
        <div className="bg-bg-card border border-border-default rounded-xl p-12 text-center">
          <Search size={48} className="mx-auto text-text-muted/30 mb-4" />
          <h3 className="text-lg font-semibold text-text-primary mb-2">No scans yet</h3>
          <p className="text-sm text-text-muted">Connect a repository and trigger a scan to see results here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {scans.map((scan) => (
            <div key={scan.id} className="bg-bg-card border border-border-default rounded-xl overflow-hidden">
              <div
                className="p-4 flex items-center gap-4 cursor-pointer hover:bg-bg-hover/50 transition-all"
                onClick={() => viewFindings(scan.id)}
              >
                {/* Status */}
                <div className="flex-shrink-0">{STATUS_ICONS[scan.status] || STATUS_ICONS.queued}</div>

                {/* Repo + Branch */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-text-primary truncate">{getRepoName(scan.repo_url)}</span>
                    <span className="text-[10px] text-text-muted flex items-center gap-0.5">
                      <GitBranch size={10} /> {scan.branch}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-[11px] text-text-muted">
                    <span>{formatDate(scan.completed_at || scan.started_at)}</span>
                    {scan.duration_seconds && <span>{scan.duration_seconds.toFixed(1)}s</span>}
                    {scan.languages.length > 0 && (
                      <span className="truncate">{scan.languages.slice(0, 3).join(", ")}</span>
                    )}
                  </div>
                </div>

                {/* Severity counts */}
                <div className="hidden md:flex items-center gap-3 text-xs">
                  {scan.critical_count > 0 && <span className="px-2 py-0.5 rounded bg-red-500/10 text-red-400 font-medium">{scan.critical_count} C</span>}
                  {scan.high_count > 0 && <span className="px-2 py-0.5 rounded bg-orange-500/10 text-orange-400 font-medium">{scan.high_count} H</span>}
                  {scan.medium_count > 0 && <span className="px-2 py-0.5 rounded bg-yellow-500/10 text-yellow-400 font-medium">{scan.medium_count} M</span>}
                  {scan.low_count > 0 && <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-medium">{scan.low_count} L</span>}
                </div>

                {/* Grade */}
                <div className={`px-3 py-1 rounded-lg font-bold text-sm ${GRADE_COLORS[scan.security_score] || "text-slate-400 bg-slate-500/10"}`}>
                  {scan.security_score}
                </div>

                {/* Actions */}
                <button
                  onClick={(e) => { e.stopPropagation(); downloadSarif(scan.id); }}
                  className="p-1.5 text-text-muted hover:text-blue-400 hover:bg-blue-500/10 rounded transition-all"
                  title="Download SARIF"
                >
                  <Download size={14} />
                </button>

                <ChevronRight size={14} className={`text-text-muted transition-transform ${selectedScan === scan.id ? "rotate-90" : ""}`} />
              </div>

              {/* Expanded findings */}
              {selectedScan === scan.id && (
                <div className="border-t border-border-default bg-bg-page/50 p-4">
                  {findings.length === 0 ? (
                    <p className="text-sm text-emerald-400 text-center py-4">✅ No vulnerabilities found</p>
                  ) : (
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                      {findings.map((f: any, idx: number) => (
                        <div key={idx} className="flex items-start gap-3 p-3 bg-bg-card rounded-lg border border-border-default">
                          <span className={`px-2 py-0.5 rounded border text-[10px] font-bold uppercase ${SEVERITY_BADGE[f.severity] || SEVERITY_BADGE.info}`}>
                            {f.severity}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-text-primary">{f.title}</p>
                            <p className="text-[11px] text-text-muted mt-0.5 truncate">
                              {f.file_path && <code className="text-blue-400">{f.file_path}:{f.line_start}</code>}
                              {f.cwe_id && <span className="ml-2">{f.cwe_id}</span>}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
