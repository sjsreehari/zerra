"use client";

import React, { useState, useEffect } from "react";
import { APIENDPOINT } from "@/config/Backend";
import {
  GitBranch,
  Plus,
  Trash2,
  Play,
  ExternalLink,
  Clock,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  X,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

interface Repo {
  id: string;
  url: string;
  branch: string;
  auto_scan: boolean;
  scan_mode: string;
  status: string;
  last_scan_id: string | null;
  created_at: string;
  last_scan?: {
    id: string;
    status: string;
    security_score: string;
    findings_count: number;
    critical_count: number;
    high_count: number;
    completed_at: string | null;
  };
}

const GRADE_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  "A+": { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/30" },
  A: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/30" },
  B: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/30" },
  C: { bg: "bg-yellow-500/10", text: "text-yellow-400", border: "border-yellow-500/30" },
  D: { bg: "bg-orange-500/10", text: "text-orange-400", border: "border-orange-500/30" },
  F: { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/30" },
};

export default function RepositoriesPage() {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const [newBranch, setNewBranch] = useState("main");
  const [newMode, setNewMode] = useState("standard");
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState<string | null>(null);

  useEffect(() => {
    fetchRepos();
  }, []);

  const fetchRepos = async () => {
    try {
      const res = await fetch(APIENDPOINT.Repos);
      if (res.ok) setRepos(await res.json());
    } catch {}
    setLoading(false);
  };

  const addRepo = async () => {
    if (!newUrl.trim()) return;
    try {
      const res = await fetch(APIENDPOINT.Repos, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: newUrl, branch: newBranch, scan_mode: newMode }),
      });
      if (res.ok) {
        setNewUrl("");
        setShowAdd(false);
        fetchRepos();
      }
    } catch {}
  };

  const deleteRepo = async (id: string) => {
    try {
      await fetch(APIENDPOINT.RepoDelete(id), { method: "DELETE" });
      fetchRepos();
    } catch {}
  };

  const triggerScan = async (id: string) => {
    setScanning(id);
    try {
      await fetch(APIENDPOINT.RepoScan(id), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "standard" }),
      });
      fetchRepos();
    } catch {}
    setScanning(null);
  };

  const getRepoName = (url: string) => {
    const parts = url.replace(/\.git$/, "").split("/");
    return parts.slice(-2).join("/");
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Repositories</h1>
          <p className="text-sm text-text-muted mt-1">
            Connect repos for continuous security monitoring. Scans run on every push.
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-medium rounded-lg hover:from-blue-500 hover:to-indigo-500 transition-all shadow-lg shadow-blue-500/25"
        >
          <Plus size={16} />
          Connect Repository
        </button>
      </div>

      {/* Add Repo Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-bg-card border border-border-default rounded-xl p-6 w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-text-primary">Connect Repository</h3>
              <button onClick={() => setShowAdd(false)} className="text-text-muted hover:text-text-primary">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1.5">Repository URL</label>
                <input
                  type="text"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  placeholder="https://github.com/user/repo"
                  className="w-full px-3 py-2.5 bg-bg-page border border-border-default rounded-lg text-sm text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1.5">Branch</label>
                  <input
                    type="text"
                    value={newBranch}
                    onChange={(e) => setNewBranch(e.target.value)}
                    className="w-full px-3 py-2.5 bg-bg-page border border-border-default rounded-lg text-sm text-text-primary focus:outline-none focus:border-blue-500/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1.5">Scan Mode</label>
                  <select
                    value={newMode}
                    onChange={(e) => setNewMode(e.target.value)}
                    className="w-full px-3 py-2.5 bg-bg-page border border-border-default rounded-lg text-sm text-text-primary focus:outline-none focus:border-blue-500/50"
                  >
                    <option value="quick">Quick (~1-3 min)</option>
                    <option value="standard">Standard (~5-15 min)</option>
                    <option value="deep">Deep (~15-60 min)</option>
                  </select>
                </div>
              </div>
              <button
                onClick={addRepo}
                className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-medium rounded-lg hover:from-blue-500 hover:to-indigo-500 transition-all"
              >
                Connect & Start Monitoring
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Repos Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-blue-400" />
        </div>
      ) : repos.length === 0 ? (
        <div className="bg-bg-card border border-border-default rounded-xl p-12 text-center">
          <GitBranch size={48} className="mx-auto text-text-muted/30 mb-4" />
          <h3 className="text-lg font-semibold text-text-primary mb-2">No repositories connected</h3>
          <p className="text-sm text-text-muted mb-6">Connect your first repo to start scanning for vulnerabilities.</p>
          <button
            onClick={() => setShowAdd(true)}
            className="px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-500 transition-all"
          >
            Connect Repository
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {repos.map((repo) => {
            const grade = repo.last_scan?.security_score || "—";
            const style = GRADE_STYLES[grade] || { bg: "bg-slate-500/10", text: "text-slate-400", border: "border-slate-500/30" };

            return (
              <div
                key={repo.id}
                className="bg-bg-card border border-border-default rounded-xl p-5 hover:border-blue-500/30 transition-all group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-text-primary truncate text-sm">{getRepoName(repo.url)}</h3>
                    <p className="text-xs text-text-muted mt-0.5 flex items-center gap-1">
                      <GitBranch size={11} /> {repo.branch}
                    </p>
                  </div>
                  {grade !== "—" && (
                    <div className={`px-3 py-1 rounded-lg border text-sm font-bold ${style.bg} ${style.text} ${style.border}`}>
                      {grade}
                    </div>
                  )}
                </div>

                {repo.last_scan ? (
                  <div className="grid grid-cols-4 gap-2 my-3">
                    {[
                      { label: "Critical", count: repo.last_scan.critical_count, color: "text-red-400" },
                      { label: "High", count: repo.last_scan.high_count, color: "text-orange-400" },
                      { label: "Findings", count: repo.last_scan.findings_count, color: "text-yellow-400" },
                      { label: "Status", count: repo.last_scan.status, color: "text-emerald-400" },
                    ].map((item) => (
                      <div key={item.label} className="text-center">
                        <div className={`text-sm font-bold ${item.color}`}>{item.count}</div>
                        <div className="text-[10px] text-text-muted">{item.label}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-text-muted/60 italic my-3">No scans yet</p>
                )}

                <div className="flex items-center gap-2 pt-3 border-t border-border-default">
                  <button
                    onClick={() => triggerScan(repo.id)}
                    disabled={scanning === repo.id}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-lg hover:bg-blue-500/20 transition-all disabled:opacity-50"
                  >
                    {scanning === repo.id ? (
                      <><Loader2 size={12} className="animate-spin" /> Scanning...</>
                    ) : (
                      <><Play size={12} /> Scan Now</>
                    )}
                  </button>
                  <button
                    onClick={() => deleteRepo(repo.id)}
                    className="p-2 text-text-muted hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
