"use client";

import React, { useState, useEffect } from "react";
import { APIENDPOINT } from "@/config/Backend";
import {
  ShieldCheck,
  Lock,
  Plus,
  Zap,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Search,
  Sliders,
  ChevronRight,
  Info,
  Trash2,
  X,
} from "lucide-react";

interface PolicyItem {
  id: string;
  name: string;
  description: string;
  rule_type: string;
  parameters: Record<string, unknown>;
  status: "active" | "simulated" | "draft";
  version: number;
  is_virtual_patch?: boolean;
}

const DEFAULT_POLICIES: PolicyItem[] = [
  {
    id: "identity-revocation",
    name: "Identity Revocation Enforcement",
    description: "Instantly block requests from compromised or revoked API keys, agents, and service credentials.",
    rule_type: "identity_revoked",
    parameters: { action: "block" },
    status: "active",
    version: 1,
  },
  {
    id: "agent-scope-contract",
    name: "Autonomous Agent Scope Contract",
    description: "Constrain autonomous AI agents and MCP servers to their declared schema boundaries.",
    rule_type: "agent_scope_contract",
    parameters: { action: "block" },
    status: "active",
    version: 1,
  },
  {
    id: "trust-score-threshold",
    name: "Adaptive Trust Score Threshold",
    description: "Enforce multi-factor verification below 70 trust, and block all calls below 40 trust.",
    rule_type: "trust_score_threshold",
    parameters: { step_up_below: 70, block_below: 40 },
    status: "active",
    version: 1,
  },
  {
    id: "novel-object-rate",
    name: "Novel Object Access Rate Anomaly",
    description: "Detect and rate-limit rapid enumeration of novel database objects (BOLA / IDOR defense).",
    rule_type: "novel_object_rate",
    parameters: { max_distinct_novel_objects: 5, window_seconds: 60, action: "step_up" },
    status: "active",
    version: 1,
  },
  {
    id: "cross-tenant-access",
    name: "Zero-Trust Cross-Tenant Boundary",
    description: "Hard block any request attempting to access resources belonging to a foreign tenant ID.",
    rule_type: "cross_tenant_access",
    parameters: { action: "block" },
    status: "active",
    version: 1,
  },
  {
    id: "vp-bola-user-profile",
    name: "Virtual Patch: BOLA Mitigation on /api/v1/users/{id}",
    description: "Synthesized by Autonomous Pentest. Blocks cross-user ID traversal in URI path.",
    rule_type: "virtual_patch_block",
    parameters: { target_pattern: "/api/v1/users/*", action: "block" },
    status: "active",
    version: 1,
    is_virtual_patch: true,
  },
];

export default function PoliciesPage() {
  const [policies, setPolicies] = useState<PolicyItem[]>(DEFAULT_POLICIES);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"all" | "core" | "virtual_patches">("all");
  const [loading, setLoading] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Form state
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formRuleType, setFormRuleType] = useState("virtual_patch_block");
  const [formPattern, setFormPattern] = useState("/api/v1/sensitive/*");
  const [formAction, setFormAction] = useState("block");
  const [submitting, setSubmitting] = useState(false);

  const fetchPolicies = async () => {
    setLoading(true);
    try {
      const res = await fetch(APIENDPOINT.Policies);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const mapped: PolicyItem[] = data.map((p: any) => ({
            ...p,
            is_virtual_patch:
              p.rule_type?.includes("virtual_patch") ||
              p.id?.startsWith("vp-") ||
              p.name?.toLowerCase().includes("virtual patch"),
          }));
          setPolicies(mapped);
        }
      }
    } catch {
      // Keep defaults on network error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPolicies();
  }, []);

  const handleCreatePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    setSubmitting(true);
    const newPolicy = {
      name: formName.trim(),
      description: formDesc.trim() || "Custom security rule created via Console",
      rule_type: formRuleType,
      parameters: {
        target_pattern: formPattern.trim(),
        action: formAction,
      },
      status: "active",
      version: 1,
    };

    try {
      const res = await fetch(APIENDPOINT.PoliciesCreate, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newPolicy),
      });
      if (res.ok) {
        const saved = await res.json();
        setPolicies((prev) => [
          {
            ...saved,
            is_virtual_patch: formRuleType.includes("virtual_patch"),
          },
          ...prev,
        ]);
        setIsCreateModalOpen(false);
        setFormName("");
        setFormDesc("");
      } else {
        // Optimistic fallback for frontend-only mode
        const localItem: PolicyItem = {
          id: `local-${Date.now()}`,
          ...newPolicy,
          is_virtual_patch: formRuleType.includes("virtual_patch"),
        } as PolicyItem;
        setPolicies((prev) => [localItem, ...prev]);
        setIsCreateModalOpen(false);
      }
    } catch {
      const localItem: PolicyItem = {
        id: `local-${Date.now()}`,
        ...newPolicy,
        is_virtual_patch: formRuleType.includes("virtual_patch"),
      } as PolicyItem;
      setPolicies((prev) => [localItem, ...prev]);
      setIsCreateModalOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePolicy = async (id: string) => {
    try {
      await fetch(APIENDPOINT.PoliciesDelete(id), { method: "DELETE" });
    } catch {
      // Optimistic delete
    }
    setPolicies((prev) => prev.filter((p) => p.id !== id));
  };

  const filtered = policies.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.rule_type.toLowerCase().includes(searchTerm.toLowerCase());
    if (filterType === "core") return matchesSearch && !p.is_virtual_patch;
    if (filterType === "virtual_patches") return matchesSearch && p.is_virtual_patch;
    return matchesSearch;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-r from-purple-950/40 via-zinc-900 to-black/80 p-6 backdrop-blur-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="flex h-2 w-2 rounded-full bg-purple-400 animate-pulse" />
              <span className="text-xs font-semibold tracking-wider uppercase text-purple-400">
                Gateway Enforcement Engine
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <ShieldCheck className="h-6 w-6 text-purple-400" />
              Zero-Trust Policies & Virtual Patches
            </h1>
            <p className="text-sm text-text-secondary mt-1 max-w-2xl">
              Inspect and deploy zero-trust rules evaluated at the Go Gateway reverse proxy. Virtual patches synthesized from autonomous pentest findings are enforced inline here.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-purple-900/30 transition-all active:scale-[0.98]"
            >
              <Plus size={14} />
              <span>New Policy Rule</span>
            </button>
            <button
              onClick={fetchPolicies}
              disabled={loading}
              className="p-2 rounded-xl bg-bg-surface border border-border-default hover:bg-bg-hover text-text-secondary transition-colors"
              title="Refresh Policies"
            >
              <RefreshCw size={14} className={loading ? "animate-spin text-purple-400" : ""} />
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterType("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filterType === "all"
                ? "bg-bg-surface-raised border border-border-strong text-text-primary"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            All Rules ({policies.length})
          </button>
          <button
            onClick={() => setFilterType("core")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filterType === "core"
                ? "bg-bg-surface-raised border border-border-strong text-text-primary"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            Core Zero-Trust
          </button>
          <button
            onClick={() => setFilterType("virtual_patches")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filterType === "virtual_patches"
                ? "bg-purple-500/15 border border-purple-500/30 text-purple-300"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            Virtual Patches (Auto-Mitigation)
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filter policies..."
            className="w-full bg-bg-surface border border-border-default rounded-lg pl-8 pr-3 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-focus"
          />
        </div>
      </div>

      {/* Policies List */}
      <div className="space-y-3">
        {filtered.map((policy) => (
          <div
            key={policy.id}
            className={`rounded-xl border p-5 transition-all bg-bg-surface ${
              policy.is_virtual_patch
                ? "border-purple-500/30 hover:border-purple-500/50 bg-gradient-to-r from-purple-950/10 to-bg-surface"
                : "border-border-default hover:border-border-strong"
            }`}
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                    {policy.is_virtual_patch ? (
                      <Zap size={14} className="text-purple-400" />
                    ) : (
                      <ShieldCheck size={14} className="text-blue-400" />
                    )}
                    {policy.name}
                  </h3>
                  {policy.is_virtual_patch && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      Inline Virtual Patch
                    </span>
                  )}
                  <span className="text-[10px] font-mono text-text-muted bg-bg-surface-sunken px-1.5 py-0.5 rounded border border-border-default">
                    v{policy.version}
                  </span>
                </div>
                <p className="text-xs text-text-secondary">{policy.description}</p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Active
                </span>
                {policy.id.startsWith("local-") || policy.id.startsWith("policy-") || policy.is_virtual_patch ? (
                  <button
                    onClick={() => handleDeletePolicy(policy.id)}
                    className="p-1.5 text-text-muted hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    title="Delete Policy"
                  >
                    <Trash2 size={13} />
                  </button>
                ) : null}
              </div>
            </div>

            {/* Rule Details Strip */}
            <div className="mt-3 pt-3 border-t border-border-default/60 flex items-center justify-between text-xs text-text-muted">
              <div className="flex items-center gap-4 font-mono text-[11px]">
                <span>Type: {policy.rule_type}</span>
                <span>•</span>
                <span>Params: {JSON.stringify(policy.parameters)}</span>
              </div>
              <span className="text-[11px] text-text-secondary">Enforced at Go Gateway</span>
            </div>
          </div>
        ))}
      </div>

      {/* Create Policy Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-bg-surface border border-border-default rounded-2xl max-w-lg w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-100">
            <div className="flex items-center justify-between pb-3 border-b border-border-default mb-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-purple-400" />
                <h2 className="text-base font-bold text-text-primary">Create Zero-Trust Policy Rule</h2>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-text-muted hover:text-text-primary p-1 rounded-lg hover:bg-bg-hover"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreatePolicy} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">
                  Policy Name
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Block Legacy Admin Endpoint"
                  className="w-full bg-bg-surface-sunken border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-focus"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Describe the threat or boundary this rule protects..."
                  className="w-full bg-bg-surface-sunken border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-focus resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">
                    Rule Type
                  </label>
                  <select
                    value={formRuleType}
                    onChange={(e) => setFormRuleType(e.target.value)}
                    className="w-full bg-bg-surface-sunken border border-border-default rounded-lg px-2.5 py-2 text-xs text-text-primary focus:outline-none focus:border-border-focus"
                  >
                    <option value="virtual_patch_block">Virtual Patch (Block)</option>
                    <option value="virtual_patch_step_up">Virtual Patch (Step-Up)</option>
                    <option value="agent_scope_contract">Agent Scope Contract</option>
                    <option value="cross_tenant_access">Cross-Tenant Boundary</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">
                    Enforcement Action
                  </label>
                  <select
                    value={formAction}
                    onChange={(e) => setFormAction(e.target.value)}
                    className="w-full bg-bg-surface-sunken border border-border-default rounded-lg px-2.5 py-2 text-xs text-text-primary focus:outline-none focus:border-border-focus"
                  >
                    <option value="block">BLOCK (403 Forbidden)</option>
                    <option value="step_up">STEP_UP (Elevate Scope)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">
                  Target URI Pattern (Glob)
                </label>
                <input
                  type="text"
                  value={formPattern}
                  onChange={(e) => setFormPattern(e.target.value)}
                  placeholder="/api/v1/users/*"
                  className="w-full bg-bg-surface-sunken border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary placeholder:text-text-muted font-mono focus:outline-none focus:border-border-focus"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-border-default">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-border-default text-xs font-medium text-text-secondary hover:bg-bg-hover"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-purple-900/30 transition-all active:scale-[0.98]"
                >
                  {submitting ? "Deploying..." : "Deploy Rule to Gateway"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
