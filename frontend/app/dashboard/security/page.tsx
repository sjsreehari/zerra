"use client";

import { useEffect, useState, useCallback } from "react";
import { APIENDPOINT } from "@/config/Backend";
import { useApiCall } from "@/hooks/useApiCall";
import {
  ShieldCheck,
  ShieldAlert,
  Play,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  MinusCircle,
  XCircle,
  Clock,
  Loader2,
  AlertCircle,
  Info,
} from "lucide-react";

type ScanMode = "passive" | "safe_active";
type JobStatus = "queued" | "running" | "completed" | "failed";
type FindingStatus = "pass" | "fail" | "warning" | "not_testable" | "error";
type Severity = "info" | "low" | "medium" | "high" | "critical";

type ScanJob = {
  ID: string;
  Subdomain: string;
  TargetURL: string;
  Status: JobStatus;
  Mode: ScanMode;
  RequestedAt: string;
  StartedAt: string | null;
  CompletedAt: string | null;
  TotalChecks: number;
  PassedChecks: number;
  FailedChecks: number;
  WarningChecks: number;
  NotTestableChecks: number;
  ErrorMessage: string | null;
};

type Finding = {
  id: string;
  job_id: string;
  owasp_id: string;
  title: string;
  severity: Severity;
  status: FindingStatus;
  endpoint: string | null;
  method: string | null;
  evidence: Record<string, unknown>;
  remediation: string;
  created_at: string;
  assessment: string;
};

type ProxyRoute = {
  id: string;
  subdomain: string;
  api_base_url: string;
};

// ── Severity helpers ────────────────────────────────────────────────────────
const severityConfig: Record<Severity, { label: string; cls: string; dot: string }> = {
  critical: { label: "Critical", cls: "bg-red-500/15 text-red-400 border-red-500/30", dot: "bg-red-500" },
  high:     { label: "High",     cls: "bg-orange-500/15 text-orange-400 border-orange-500/30", dot: "bg-orange-500" },
  medium:   { label: "Medium",   cls: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30", dot: "bg-yellow-500" },
  low:      { label: "Low",      cls: "bg-sky-500/15 text-sky-400 border-sky-500/30", dot: "bg-sky-500" },
  info:     { label: "Info",     cls: "bg-white/10 text-white/50 border-white/10", dot: "bg-white/30" },
};

const statusConfig: Record<FindingStatus, { icon: React.ReactNode; cls: string; label: string }> = {
  pass:         { icon: <CheckCircle size={14} />,  cls: "text-emerald-400", label: "Pass" },
  fail:         { icon: <XCircle size={14} />,      cls: "text-red-400",     label: "Fail" },
  warning:      { icon: <AlertTriangle size={14} />,cls: "text-yellow-400",  label: "Warning" },
  not_testable: { icon: <MinusCircle size={14} />,  cls: "text-white/40",    label: "Not Testable" },
  error:        { icon: <AlertCircle size={14} />,  cls: "text-orange-400",  label: "Error" },
};

const jobStatusConfig: Record<JobStatus, { label: string; cls: string }> = {
  queued:    { label: "Queued",    cls: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
  running:   { label: "Scanning…", cls: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30" },
  completed: { label: "Complete",  cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  failed:    { label: "Failed",    cls: "bg-red-500/15 text-red-400 border-red-500/30" },
};

function fmt(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString([], { dateStyle: "short", timeStyle: "short" });
}

// ── Findings accordion row ──────────────────────────────────────────────────
function FindingRow({ f }: { f: Finding }) {
  const [open, setOpen] = useState(false);
  const sev = severityConfig[f.severity] ?? severityConfig.info;
  const st = statusConfig[f.status] ?? statusConfig.not_testable;

  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.03] overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/5 transition-all"
      >
        <span className={`flex items-center gap-1 text-xs font-medium ${st.cls}`}>
          {st.icon} {st.label}
        </span>
        <span className="flex-1 text-sm font-medium text-white/90 truncate">{f.title}</span>
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${sev.cls}`}>
          {sev.label}
        </span>
        <span className="text-[10px] font-mono text-white/40">{f.owasp_id}</span>
        {open ? <ChevronDown size={14} className="text-white/40" /> : <ChevronRight size={14} className="text-white/40" />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-white/5 pt-3">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-white/40 mb-1">Remediation</p>
            <p className="text-sm text-white/70">{f.remediation}</p>
          </div>
          {f.endpoint && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-white/40 mb-1">Endpoint Tested</p>
              <code className="text-xs font-mono text-blue-300">{f.method ?? "GET"} {f.endpoint}</code>
            </div>
          )}
          {Object.keys(f.evidence).length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-white/40 mb-1">Evidence</p>
              <pre className="text-xs bg-black/30 border border-white/5 rounded-lg p-3 text-white/60 overflow-x-auto">
                {JSON.stringify(f.evidence, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Job card ────────────────────────────────────────────────────────────────
function JobCard({ job, isPolling }: { job: ScanJob; isPolling: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const { data: findings, loading: loadingFindings, execute: fetchFindings } = useApiCall<Finding[]>();

  useEffect(() => {
    if (expanded && job.Status === "completed") {
      void fetchFindings(APIENDPOINT.SecurityScanFindings(job.ID));
    }
  }, [expanded, job.Status, job.ID, fetchFindings]);

  const st = jobStatusConfig[job.Status] ?? jobStatusConfig.queued;
  const passRate = job.TotalChecks > 0 ? Math.round((job.PassedChecks / job.TotalChecks) * 100) : 0;

  return (
    <div className="rounded-2xl border border-white/5 bg-[#0a0e1a]/80 backdrop-blur-xl overflow-hidden hover:border-blue-500/20 transition-all">
      {/* Header row */}
      <div className="flex items-center gap-4 px-5 py-4">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-sm flex-shrink-0">
          {job.Subdomain.charAt(0).toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-white text-sm capitalize">{job.Subdomain}</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${st.cls} inline-flex items-center gap-1`}>
              {(job.Status === "queued" || job.Status === "running") && isPolling && (
                <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
              )}
              {st.label}
            </span>
            <span className="text-[10px] text-white/40 font-mono px-1.5 py-0.5 rounded bg-white/5">
              {job.Mode}
            </span>
          </div>
          <p className="text-xs text-white/40 mt-0.5 truncate">{job.TargetURL}</p>
        </div>

        {/* Score pills */}
        {job.Status === "completed" && job.TotalChecks > 0 && (
          <div className="hidden sm:flex items-center gap-2 text-xs">
            <span className="text-emerald-400 font-semibold">{job.PassedChecks} ✓</span>
            <span className="text-red-400 font-semibold">{job.FailedChecks} ✗</span>
            <span className="text-yellow-400 font-semibold">{job.WarningChecks} !</span>
          </div>
        )}

        <button
          onClick={() => setExpanded((v) => !v)}
          className="p-2 rounded-lg bg-white/5 border border-white/10 text-white/40 hover:text-white hover:bg-white/10 transition-all flex-shrink-0"
        >
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
      </div>

      {/* Progress bar */}
      {job.Status === "completed" && job.TotalChecks > 0 && (
        <div className="px-5 pb-3">
          <div className="flex justify-between text-[10px] text-white/40 mb-1">
            <span>Pass rate</span>
            <span>{passRate}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-700"
              style={{ width: `${passRate}%` }}
            />
          </div>
        </div>
      )}

      {/* Meta row */}
      <div className="flex items-center gap-4 px-5 pb-3 text-[10px] text-white/30 flex-wrap">
        <span className="flex items-center gap-1"><Clock size={10} /> Requested {fmt(job.RequestedAt)}</span>
        {job.CompletedAt && <span>Completed {fmt(job.CompletedAt)}</span>}
        {job.ErrorMessage && <span className="text-red-400">Error: {job.ErrorMessage}</span>}
      </div>

      {/* Expanded findings */}
      {expanded && (
        <div className="border-t border-white/5 px-5 py-4 space-y-3">
          {job.Status !== "completed" ? (
            <p className="text-sm text-white/40 text-center py-4">
              Findings are available once the scan completes.
            </p>
          ) : loadingFindings ? (
            <div className="flex justify-center py-6">
              <Loader2 className="animate-spin text-blue-400" size={20} />
            </div>
          ) : findings && findings.length > 0 ? (
            <>
              <p className="text-xs text-white/40 font-medium uppercase tracking-wider mb-2">
                OWASP API Security Top 10 — {findings.length} checks
              </p>
              <div className="space-y-2">
                {findings.map((f) => <FindingRow key={f.id || f.owasp_id} f={f} />)}
              </div>
            </>
          ) : (
            <p className="text-sm text-white/40 text-center py-4">No findings recorded for this scan.</p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function SecurityScansPage() {
  const { execute: fetchProxies } = useApiCall<ProxyRoute[]>();
  const { execute: submitScan, loading: submitting, error: submitError } = useApiCall<{ job_id: string; status: string }>();
  const { execute: fetchJobs, error: jobsError } = useApiCall<ScanJob[]>();

  const [proxies, setProxies] = useState<ProxyRoute[]>([]);
  const [jobs, setJobs] = useState<ScanJob[]>([]);
  const [selectedSubdomain, setSelectedSubdomain] = useState("");
  const [mode, setMode] = useState<ScanMode>("passive");
  const [formError, setFormError] = useState("");
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [filterSubdomain, setFilterSubdomain] = useState("");

  const loadJobs = useCallback(async (subdomain = "") => {
    const url = subdomain ? `${APIENDPOINT.SecurityScans}?subdomain=${subdomain}` : APIENDPOINT.SecurityScans;
    const result = await fetchJobs(url);
    if (Array.isArray(result)) setJobs(result);
    setLoadingJobs(false);
  }, [fetchJobs]);

  // Load proxies and initial jobs
  useEffect(() => {
    void (async () => {
      const routes = await fetchProxies(APIENDPOINT.Proxy);
      if (Array.isArray(routes)) {
        setProxies(routes);
        if (routes.length > 0) setSelectedSubdomain(routes[0].subdomain);
      }
      await loadJobs();
    })();
  }, [fetchProxies, loadJobs]);

  // Poll while any job is running/queued
  useEffect(() => {
    const hasActive = jobs.some((j) => j.Status === "queued" || j.Status === "running");
    if (!hasActive) return;
    const id = window.setInterval(() => void loadJobs(filterSubdomain), 3000);
    return () => window.clearInterval(id);
  }, [jobs, filterSubdomain, loadJobs]);

  async function handleStartScan(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    if (!selectedSubdomain) {
      setFormError("Select a registered subdomain to scan.");
      return;
    }
    const res = await submitScan(APIENDPOINT.SecurityScans, {
      method: "POST",
      body: JSON.stringify({ subdomain: selectedSubdomain, mode }),
    });
    if (res) await loadJobs(filterSubdomain);
  }

  const hasActive = jobs.some((j) => j.Status === "queued" || j.Status === "running");
  const filteredJobs = filterSubdomain ? jobs.filter((j) => j.Subdomain === filterSubdomain) : jobs;

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">OWASP Security Scans</h1>
            {hasActive && (
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 inline-flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" /> Scanning
              </span>
            )}
          </div>
          <p className="text-sm text-white/50 mt-1">
            Run OWASP API Security Top 10 passive checks against your registered proxy subdomains.
          </p>
        </div>

        <button
          onClick={() => { setLoadingJobs(true); void loadJobs(filterSubdomain); }}
          disabled={loadingJobs}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white/70 text-sm font-medium hover:bg-white/10 transition-all disabled:opacity-50"
        >
          <RefreshCw size={15} className={loadingJobs ? "animate-spin text-blue-400" : ""} />
          Refresh
        </button>
      </div>

      {/* OWASP badge strip */}
      <div className="flex flex-wrap gap-2">
        {["API1","API2","API3","API4","API5","API6","API7","API8","API9","API10"].map((id) => (
          <span key={id} className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/8 text-[10px] font-mono text-white/50">
            {id}:2023
          </span>
        ))}
      </div>

      {/* Launch scan form */}
      <form
        onSubmit={handleStartScan}
        className="p-6 rounded-2xl bg-[#0a0e1a]/90 border border-blue-500/20 backdrop-blur-xl shadow-2xl"
      >
        <div className="flex items-center gap-2 mb-4 pb-4 border-b border-white/5">
          <ShieldCheck className="text-blue-400" size={20} />
          <h3 className="text-base font-semibold text-white">Launch New OWASP Scan</h3>
        </div>

        {(formError || submitError) && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
            <AlertCircle size={16} /> <span>{formError || submitError}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Subdomain picker */}
          <div className="md:col-span-2 space-y-1.5">
            <label className="text-xs font-medium text-white/70">Target Subdomain</label>
            {proxies.length === 0 ? (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/40 text-sm">
                <Info size={14} />
                <span>No registered subdomains — add one in the APIs tab first.</span>
              </div>
            ) : (
              <select
                value={selectedSubdomain}
                onChange={(e) => setSelectedSubdomain(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-blue-500/50 transition-all appearance-none"
              >
                {proxies.map((p) => (
                  <option key={p.subdomain} value={p.subdomain} className="bg-[#0a0e1a]">
                    {p.subdomain} → {p.api_base_url}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Scan mode */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-white/70">Scan Mode</label>
            <div className="flex gap-2">
              {(["passive", "safe_active"] as ScanMode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`flex-1 py-2.5 rounded-xl border text-xs font-medium transition-all ${
                    mode === m
                      ? "bg-blue-500/20 border-blue-500/50 text-blue-400"
                      : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10"
                  }`}
                >
                  {m === "passive" ? "Passive" : "Safe Active"}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end mt-4 pt-4 border-t border-white/5">
          <button
            type="submit"
            disabled={submitting || proxies.length === 0}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-medium text-sm shadow-lg shadow-blue-500/20 hover:opacity-95 transition-all disabled:opacity-50"
          >
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
            {submitting ? "Starting scan…" : "Start OWASP Scan"}
          </button>
        </div>
      </form>

      {/* Filter bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs text-white/50 font-medium">Filter by subdomain:</span>
        <button
          onClick={() => { setFilterSubdomain(""); void loadJobs(""); }}
          className={`px-3 py-1 rounded-lg text-xs font-medium border transition-all ${
            filterSubdomain === ""
              ? "bg-blue-500/20 border-blue-500/40 text-blue-400"
              : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10"
          }`}
        >
          All
        </button>
        {proxies.map((p) => (
          <button
            key={p.subdomain}
            onClick={() => { setFilterSubdomain(p.subdomain); void loadJobs(p.subdomain); }}
            className={`px-3 py-1 rounded-lg text-xs font-medium border transition-all ${
              filterSubdomain === p.subdomain
                ? "bg-blue-500/20 border-blue-500/40 text-blue-400"
                : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10"
            }`}
          >
            {p.subdomain}
          </button>
        ))}
      </div>

      {/* Error */}
      {jobsError && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
          <AlertCircle size={18} /> Failed to load scans: {jobsError}
        </div>
      )}

      {/* Scan jobs list */}
      {loadingJobs && jobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 space-y-3">
          <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
          <p className="text-sm text-white/40">Loading scan history…</p>
        </div>
      ) : filteredJobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 rounded-2xl bg-[#0a0e1a]/60 border border-white/5 text-center">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-3">
            <ShieldAlert size={24} />
          </div>
          <h3 className="text-base font-semibold text-white">No Security Scans Yet</h3>
          <p className="text-xs text-white/40 max-w-md mt-1">
            Launch your first OWASP API Security scan above to audit a registered subdomain target.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-white/40 font-medium uppercase tracking-wider">
            {filteredJobs.length} scan{filteredJobs.length !== 1 ? "s" : ""} found
          </p>
          {filteredJobs.map((job) => (
            <JobCard key={job.ID} job={job} isPolling={hasActive} />
          ))}
        </div>
      )}
    </div>
  );
}
