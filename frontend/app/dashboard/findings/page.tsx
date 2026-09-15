"use client";

import React, { useState, useEffect } from "react";
import { APIENDPOINT } from "@/config/Backend";
import {
  Bug,
  Filter,
  Loader2,
  Code2,
  FileWarning,
  ShieldAlert,
  ArrowUpDown,
} from "lucide-react";

interface Finding {
  id: string;
  title: string;
  description: string;
  severity: string;
  vulnerability_type: string;
  cwe_id: string | null;
  cvss_score: number | null;
  owasp_category: string | null;
  file_path: string | null;
  line_start: number | null;
  code_snippet: string | null;
  rule_id: string | null;
  confidence: number;
  status: string;
  package_name: string | null;
  fixed_version: string | null;
  scan_id: string;
  repo_url: string;
  fix_suggestion?: {
    file_path: string;
    original_code: string;
    fixed_code: string;
    explanation: string;
  } | null;
}

const SEVERITY_CONFIG: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  critical: { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/20", dot: "bg-red-400" },
  high: { bg: "bg-orange-500/10", text: "text-orange-400", border: "border-orange-500/20", dot: "bg-orange-400" },
  medium: { bg: "bg-yellow-500/10", text: "text-yellow-400", border: "border-yellow-500/20", dot: "bg-yellow-400" },
  low: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20", dot: "bg-emerald-400" },
  info: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/20", dot: "bg-blue-400" },
};

const TYPE_LABELS: Record<string, { label: string; icon: React.ReactNode }> = {
  sast: { label: "Code", icon: <Code2 size={12} /> },
  sca: { label: "Dependency", icon: <FileWarning size={12} /> },
  secret: { label: "Secret", icon: <ShieldAlert size={12} /> },
  misconfig: { label: "Config", icon: <Bug size={12} /> },
  dast: { label: "Runtime", icon: <Bug size={12} /> },
};

export default function FindingsPage() {
  const [findings, setFindings] = useState<Finding[]>([]);
  const [loading, setLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [prLoading, setPrLoading] = useState<string | null>(null);
  const [prSuccess, setPrSuccess] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchFindings();
  }, []);

  const fetchFindings = async () => {
    try {
      const res = await fetch(APIENDPOINT.Findings);
      if (res.ok) setFindings(await res.json());
    } catch {}
    setLoading(false);
  };

  const filtered = severityFilter === "all"
    ? findings
    : findings.filter((f) => f.severity === severityFilter);

  const counts = {
    all: findings.length,
    critical: findings.filter((f) => f.severity === "critical").length,
    high: findings.filter((f) => f.severity === "high").length,
    medium: findings.filter((f) => f.severity === "medium").length,
    low: findings.filter((f) => f.severity === "low").length,
  };

  const getRepoName = (url: string) => url.replace(/\.git$/, "").split("/").slice(-2).join("/");

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Findings</h1>
        <p className="text-sm text-text-muted mt-1">
          All security vulnerabilities across your connected repositories.
        </p>
      </div>

      {/* Severity Filter Pills */}
      <div className="flex items-center gap-2 flex-wrap">
        {(["all", "critical", "high", "medium", "low"] as const).map((sev) => {
          const isActive = severityFilter === sev;
          const config = SEVERITY_CONFIG[sev] || { bg: "bg-slate-500/10", text: "text-slate-400", border: "border-slate-500/20" };
          return (
            <button
              key={sev}
              onClick={() => setSeverityFilter(sev)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                isActive
                  ? sev === "all"
                    ? "bg-blue-500/10 text-blue-400 border-blue-500/30"
                    : `${config.bg} ${config.text} ${config.border}`
                  : "bg-bg-card text-text-muted border-border-default hover:bg-bg-hover"
              }`}
            >
              {sev === "all" ? "All" : sev.charAt(0).toUpperCase() + sev.slice(1)} ({counts[sev]})
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-blue-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-bg-card border border-border-default rounded-xl p-12 text-center">
          <Bug size={48} className="mx-auto text-text-muted/30 mb-4" />
          <h3 className="text-lg font-semibold text-text-primary mb-2">
            {findings.length === 0 ? "No findings yet" : "No findings match this filter"}
          </h3>
          <p className="text-sm text-text-muted">
            {findings.length === 0
              ? "Run a scan on a repository to see security findings."
              : "Try adjusting the severity filter."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((f, idx) => {
            const config = SEVERITY_CONFIG[f.severity] || SEVERITY_CONFIG.info;
            const typeInfo = TYPE_LABELS[f.vulnerability_type] || TYPE_LABELS.sast;
            const isExpanded = expandedId === `${f.scan_id}-${idx}`;

            return (
              <div
                key={`${f.scan_id}-${idx}`}
                className={`bg-bg-card border rounded-xl overflow-hidden transition-all ${
                  isExpanded ? "border-blue-500/30" : "border-border-default hover:border-border-default/80"
                }`}
              >
                <div
                  className="p-4 flex items-start gap-3 cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : `${f.scan_id}-${idx}`)}
                >
                  {/* Severity dot */}
                  <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${config.dot}`} />

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded border text-[10px] font-bold uppercase ${config.bg} ${config.text} ${config.border}`}>
                        {f.severity}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-slate-500/10 text-slate-400 border border-slate-500/20 text-[10px] font-medium flex items-center gap-1">
                        {typeInfo.icon} {typeInfo.label}
                      </span>
                      {f.cwe_id && (
                        <span className="text-[10px] text-text-muted font-mono">{f.cwe_id}</span>
                      )}
                    </div>
                    <h4 className="text-sm font-medium text-text-primary mt-1.5">{f.title}</h4>
                    <div className="flex items-center gap-3 mt-1 text-[11px] text-text-muted">
                      {f.file_path && <code className="text-blue-400/80">{f.file_path}:{f.line_start}</code>}
                      <span>{getRepoName(f.repo_url)}</span>
                    </div>
                  </div>

                  {/* CVSS */}
                  {f.cvss_score && (
                    <div className="text-right flex-shrink-0">
                      <div className={`text-sm font-bold ${config.text}`}>{f.cvss_score.toFixed(1)}</div>
                      <div className="text-[9px] text-text-muted">CVSS</div>
                    </div>
                  )}
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="border-t border-border-default bg-bg-page/50 p-4 space-y-3">
                    <p className="text-sm text-text-secondary">{f.description}</p>

                    {f.code_snippet && (
                      <div className="bg-bg-card rounded-lg border border-border-default p-3">
                        <p className="text-[10px] text-text-muted mb-1 font-medium">Code</p>
                        <pre className="text-xs text-text-primary font-mono overflow-x-auto">{f.code_snippet}</pre>
                      </div>
                    )}

                    {/* Fix Suggestion & Auto-PR Action */}
                    {f.fix_suggestion ? (
                      <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            Auto-Remediation Available
                          </span>
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              setPrLoading(f.id);
                              try {
                                const res = await fetch(APIENDPOINT.FindingCreatePR(f.id), {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({}),
                                });
                                const data = await res.json();
                                setPrSuccess((prev) => ({ ...prev, [f.id]: data.pr_url || data.branch || "PR Generated" }));
                              } catch {
                                setPrSuccess((prev) => ({ ...prev, [f.id]: "Error generating PR" }));
                              }
                              setPrLoading(null);
                            }}
                            disabled={prLoading === f.id}
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-md transition-all flex items-center gap-1.5 shadow-sm active:scale-95 disabled:opacity-50"
                          >
                            {prLoading === f.id ? (
                              <>
                                <Loader2 size={12} className="animate-spin" />
                                <span>Generating PR...</span>
                              </>
                            ) : (
                              <span>Create Fix PR 🚀</span>
                            )}
                          </button>
                        </div>
                        <p className="text-xs text-text-secondary">{f.fix_suggestion.explanation}</p>
                        <div className="bg-black/40 rounded p-2 text-xs font-mono">
                          <div className="text-red-400 line-through">- {f.fix_suggestion.original_code}</div>
                          <div className="text-emerald-400">+ {f.fix_suggestion.fixed_code}</div>
                        </div>
                        {prSuccess[f.id] && (
                          <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded text-xs text-emerald-300 flex items-center justify-between">
                            <span>✅ PR Created: {prSuccess[f.id]}</span>
                            <span className="font-mono text-[10px] text-emerald-400">Branch: zerra/fix-{f.id.slice(0, 8)}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex justify-end">
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            setPrLoading(f.id);
                            try {
                              const res = await fetch(APIENDPOINT.FindingCreatePR(f.id), {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({}),
                              });
                              const data = await res.json();
                              setPrSuccess((prev) => ({ ...prev, [f.id]: data.pr_url || "PR opened" }));
                            } catch {
                              setPrSuccess((prev) => ({ ...prev, [f.id]: "Manual patch required" }));
                            }
                            setPrLoading(null);
                          }}
                          disabled={prLoading === f.id}
                          className="px-3 py-1 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-xs font-medium rounded-md transition-all flex items-center gap-1.5"
                        >
                          {prLoading === f.id ? <Loader2 size={12} className="animate-spin" /> : null}
                          <span>Request AI PR</span>
                        </button>
                      </div>
                    )}

                    {f.owasp_category && (
                      <span className="text-[10px] text-text-muted">OWASP: {f.owasp_category}</span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
