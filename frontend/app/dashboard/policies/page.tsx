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
    description: "Synthesized by Autonomous Pentest job #e4a1. Blocks cross-user ID traversal in URI path.",
    rule_type: "virtual_patch_block",
    parameters: { target_pattern: "/api/v1/users/*", action: "block", synthesized_from_job: "e4a1" },
    status: "active",
    version: 1,
    is_virtual_patch: true,
  },
];

export default function PoliciesPage() {
  const [policies, setPolicies] = useState<PolicyItem[]>(DEFAULT_POLICIES);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"all" | "core" | "virtual_patches">("all");

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
              Inspect active zero-trust rules evaluated by the Go Gateway proxy. Virtual patches synthesized from autonomous pentest findings are deployed inline here.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center gap-1.5">
              <CheckCircle2 size={13} />
              All Rules Active
            </span>
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
            Core Zero-Trust (5)
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
    </div>
  );
}
