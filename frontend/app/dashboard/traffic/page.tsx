"use client";

import React, { useState } from "react";
import {
  Radar,
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Filter,
  ArrowUpDown,
  RefreshCw,
  Server,
  Zap,
} from "lucide-react";

interface TrafficCall {
  id: string;
  timestamp: string;
  method: "GET" | "POST" | "PUT" | "DELETE";
  endpoint: string;
  identity: string;
  identity_type: "agent" | "mcp_server" | "service" | "human";
  trust_score: number;
  verdict: "allow" | "step_up" | "block";
  latency_ms: number;
  rule_matched?: string;
}

const SAMPLE_CALLS: TrafficCall[] = [
  {
    id: "call-91a",
    timestamp: "Just now",
    method: "GET",
    endpoint: "/api/v1/users/1042/profile",
    identity: "agent-order-bot",
    identity_type: "agent",
    trust_score: 95,
    verdict: "allow",
    latency_ms: 1.4,
  },
  {
    id: "call-91b",
    timestamp: "12s ago",
    method: "POST",
    endpoint: "/api/v1/admin/roles/grant",
    identity: "external-crawler",
    identity_type: "human",
    trust_score: 32,
    verdict: "block",
    latency_ms: 0.8,
    rule_matched: "agent-scope-contract",
  },
  {
    id: "call-91c",
    timestamp: "35s ago",
    method: "GET",
    endpoint: "/api/v1/cloud/metadata/credentials",
    identity: "mcp-eval-tool",
    identity_type: "mcp_server",
    trust_score: 25,
    verdict: "block",
    latency_ms: 0.9,
    rule_matched: "vp-ssrf-cloud-metadata",
  },
  {
    id: "call-91d",
    timestamp: "1m ago",
    method: "GET",
    endpoint: "/api/v1/products/featured",
    identity: "service-catalog",
    identity_type: "service",
    trust_score: 100,
    verdict: "allow",
    latency_ms: 2.1,
  },
  {
    id: "call-91e",
    timestamp: "2m ago",
    method: "POST",
    endpoint: "/api/v1/billing/payout",
    identity: "finance-agent-alpha",
    identity_type: "agent",
    trust_score: 65,
    verdict: "step_up",
    latency_ms: 1.8,
    rule_matched: "trust-score-threshold",
  },
];

export default function TrafficPage() {
  const [filterVerdict, setFilterVerdict] = useState<"all" | "allow" | "step_up" | "block">("all");

  const filtered = SAMPLE_CALLS.filter((call) =>
    filterVerdict === "all" ? true : call.verdict === filterVerdict
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-r from-blue-950/40 via-zinc-900 to-black/80 p-6 backdrop-blur-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="flex h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
              <span className="text-xs font-semibold tracking-wider uppercase text-blue-400">
                Go Gateway Reverse Proxy
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Radar className="h-6 w-6 text-blue-400" />
              Live Traffic & Authorization Stream
            </h1>
            <p className="text-sm text-text-secondary mt-1 max-w-2xl">
              Inspect live API traffic passing through the high-performance Go Gateway proxy. Every request is scored and evaluated by the zero-trust policy engine in sub-millisecond time.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold flex items-center gap-1.5">
              <Activity size={13} className="animate-pulse" />
              Streaming Telemetry Active
            </span>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-bg-surface border border-border-default rounded-xl p-4">
          <div className="text-xs text-text-secondary mb-1">Allowed Requests (Green Zone)</div>
          <div className="text-2xl font-bold text-emerald-400">98.4%</div>
          <div className="text-[11px] text-text-muted mt-1">Legitimate human & agent traffic</div>
        </div>
        <div className="bg-bg-surface border border-border-default rounded-xl p-4">
          <div className="text-xs text-text-secondary mb-1">Step-Up Challenges (Yellow Zone)</div>
          <div className="text-2xl font-bold text-amber-400">1.2%</div>
          <div className="text-[11px] text-text-muted mt-1">MFA & scope renegotiation required</div>
        </div>
        <div className="bg-bg-surface border border-border-default rounded-xl p-4">
          <div className="text-xs text-text-secondary mb-1">Blocked Attacks (Red Zone)</div>
          <div className="text-2xl font-bold text-red-400">0.4%</div>
          <div className="text-[11px] text-text-muted mt-1">Neutralized via Zero-Trust & Virtual Patches</div>
        </div>
      </div>

      {/* Traffic Table */}
      <div className="rounded-2xl border border-border-default bg-bg-surface overflow-hidden shadow-sm">
        <div className="p-4 border-b border-border-default flex items-center justify-between">
          <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2">
            <Activity size={15} className="text-blue-500" />
            Inspected API Calls
          </h2>
          <div className="flex items-center gap-2">
            {(["all", "allow", "step_up", "block"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setFilterVerdict(v)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium uppercase transition-all ${
                  filterVerdict === v
                    ? "bg-bg-surface-raised border border-border-strong text-text-primary"
                    : "text-text-muted hover:text-text-secondary"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-bg-surface-sunken border-b border-border-default text-text-secondary uppercase text-[10px] font-mono">
              <tr>
                <th className="py-3 px-4">Method & Endpoint</th>
                <th className="py-3 px-4">Identity</th>
                <th className="py-3 px-4">Trust Score</th>
                <th className="py-3 px-4">Gateway Verdict</th>
                <th className="py-3 px-4">Latency</th>
                <th className="py-3 px-4">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-default">
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-bg-hover transition-colors">
                  <td className="py-3 px-4 font-mono">
                    <span
                      className={`mr-2 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        c.method === "GET"
                          ? "bg-blue-500/10 text-blue-400"
                          : c.method === "POST"
                          ? "bg-emerald-500/10 text-emerald-400"
                          : "bg-amber-500/10 text-amber-400"
                      }`}
                    >
                      {c.method}
                    </span>
                    <span className="text-text-primary">{c.endpoint}</span>
                    {c.rule_matched && (
                      <span className="block text-[10px] text-purple-400 font-mono mt-0.5">
                        Rule: {c.rule_matched}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <div className="text-text-primary font-medium">{c.identity}</div>
                    <div className="text-[10px] text-text-muted uppercase font-mono">{c.identity_type}</div>
                  </td>
                  <td className="py-3 px-4 font-mono font-semibold">
                    <span
                      className={
                        c.trust_score >= 70
                          ? "text-emerald-400"
                          : c.trust_score >= 40
                          ? "text-amber-400"
                          : "text-red-400"
                      }
                    >
                      {c.trust_score}/100
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {c.verdict === "allow" && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                        <CheckCircle2 size={11} /> Allow
                      </span>
                    )}
                    {c.verdict === "step_up" && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
                        <AlertTriangle size={11} /> Step Up
                      </span>
                    )}
                    {c.verdict === "block" && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 font-medium">
                        <XCircle size={11} /> Blocked (403)
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 font-mono text-text-muted">{c.latency_ms} ms</td>
                  <td className="py-3 px-4 text-text-muted">{c.timestamp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
