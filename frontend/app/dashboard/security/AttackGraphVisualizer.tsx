"use client";

import React, { useState } from "react";
import {
  Brain,
  Shield,
  ShieldAlert,
  Zap,
  CheckCircle2,
  Terminal,
  Activity,
  Layers,
  Lock,
  ArrowRight,
  Cpu,
  Globe,
  Radio,
} from "lucide-react";

interface AgentNode {
  id: string;
  name: string;
  role: string;
  status: "idle" | "active" | "completed" | "found_exploit";
  requestsSent: number;
  findingsCount: number;
  description: string;
}

interface AttackGraphProps {
  targetUrl: string;
  isRunning: boolean;
  eventsCount: number;
  findingsCount: number;
  patchesCount: number;
}

export default function AttackGraphVisualizer({
  targetUrl,
  isRunning,
  eventsCount,
  findingsCount,
  patchesCount,
}: AttackGraphProps) {
  const [selectedNode, setSelectedNode] = useState<AgentNode | null>(null);

  const agents: AgentNode[] = [
    {
      id: "root",
      name: "Root Orchestrator",
      role: "Supervision & Budget Ledger",
      status: isRunning ? "active" : eventsCount > 0 ? "completed" : "idle",
      requestsSent: Math.min(eventsCount * 2, 60),
      findingsCount: findingsCount,
      description: "Allocates request budgets, enforces non-destructive rate limits, and coordinates specialist attack agents.",
    },
    {
      id: "recon",
      name: "Recon & Contract Ingestion",
      role: "OpenAPI 3.x / GraphQL Fuzzer",
      status: isRunning ? "active" : eventsCount > 0 ? "completed" : "idle",
      requestsSent: Math.min(Math.floor(eventsCount * 0.8), 25),
      findingsCount: 0,
      description: "Extracts parameter schemas, parses OpenAPI specs, discovers undocumented paths, and maps attack surfaces.",
    },
    {
      id: "bola",
      name: "BOLA / IDOR Specialist",
      role: "Object Boundary Mutation",
      status: findingsCount > 0 ? "found_exploit" : isRunning ? "active" : "idle",
      requestsSent: Math.min(Math.floor(eventsCount * 0.5), 18),
      findingsCount: Math.min(findingsCount, 1),
      description: "Mutates numerical and UUID parameters across tenant contexts to prove cross-tenant object access.",
    },
    {
      id: "auth",
      name: "Broken Auth Specialist",
      role: "Token Tampering & Revocation",
      status: isRunning ? "active" : eventsCount > 10 ? "completed" : "idle",
      requestsSent: Math.min(Math.floor(eventsCount * 0.4), 12),
      findingsCount: 0,
      description: "Tests weak HMAC signatures, none algorithm exploits, revoked sessions, and bearer token leaks.",
    },
    {
      id: "ssrf",
      name: "SSRF & Cloud Metadata Specialist",
      role: "Cloud Exfiltration Prober",
      status: isRunning ? "active" : eventsCount > 15 ? "completed" : "idle",
      requestsSent: Math.min(Math.floor(eventsCount * 0.3), 8),
      findingsCount: 0,
      description: "Probes webhooks and URL query parameters for loopback 127.0.0.1 and AWS IMDSv2 metadata leakage.",
    },
    {
      id: "validator",
      name: "PoC Verification Agent",
      role: "Counterevidence Calibrator",
      status: findingsCount > 0 ? "found_exploit" : isRunning ? "active" : "idle",
      requestsSent: findingsCount * 2,
      findingsCount: findingsCount,
      description: "Executes working cURL and Python PoCs against live indicators and applies counterevidence discipline.",
    },
    {
      id: "defense",
      name: "Zero-Trust Virtual Patch Synthesizer",
      role: "Gateway Proxy Enforcer",
      status: patchesCount > 0 ? "completed" : isRunning ? "active" : "idle",
      requestsSent: 0,
      findingsCount: patchesCount,
      description: "Translates verified vulnerabilities into real-time Go Gateway proxy zero-trust policies to block exploits inline.",
    },
  ];

  return (
    <div className="space-y-4">
      {/* Graph Visual Canvas */}
      <div className="relative rounded-2xl border border-white/10 bg-black/80 p-6 md:p-8 overflow-hidden backdrop-blur-xl">
        {/* Background Grid Accent */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f29370f_1px,transparent_1px),linear-gradient(to_bottom,#1f29370f_1px,transparent_1px)] bg-[size:24px_24px]" />

        {/* Top Target Node */}
        <div className="relative z-10 flex flex-col items-center justify-center text-center pb-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-blue-950/60 border border-blue-500/40 text-blue-300 shadow-lg shadow-blue-500/10">
            <Globe size={16} className="text-blue-400" />
            <span className="font-mono text-xs font-semibold">{targetUrl}</span>
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <div className="h-6 w-px bg-gradient-to-b from-blue-500/50 to-transparent" />
        </div>

        {/* Multi-Agent Coordination Topology */}
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Column 1: Recon & Orchestration */}
          <div className="space-y-3">
            <h4 className="text-[11px] font-mono uppercase tracking-wider text-text-muted flex items-center gap-1.5">
              <Activity size={12} className="text-blue-400" /> Orchestration Layer
            </h4>
            {[agents[0], agents[1]].map((node) => (
              <div
                key={node.id}
                onClick={() => setSelectedNode(node)}
                className={`cursor-pointer p-4 rounded-xl border transition-all ${
                  selectedNode?.id === node.id
                    ? "border-blue-500 bg-blue-950/30 shadow-md shadow-blue-500/10"
                    : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-semibold text-xs text-white flex items-center gap-2">
                    <Cpu size={14} className="text-blue-400" />
                    {node.name}
                  </span>
                  <span
                    className={`h-2 w-2 rounded-full ${
                      node.status === "active"
                        ? "bg-amber-400 animate-ping"
                        : node.status === "completed"
                        ? "bg-blue-400"
                        : "bg-white/20"
                    }`}
                  />
                </div>
                <div className="text-[11px] text-white/50">{node.role}</div>
                <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-white/40 font-mono">
                  <span>Reqs: {node.requestsSent}</span>
                  <span>Status: {node.status.toUpperCase()}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Column 2: Specialist Offensive Agents */}
          <div className="space-y-3">
            <h4 className="text-[11px] font-mono uppercase tracking-wider text-text-muted flex items-center gap-1.5">
              <Zap size={12} className="text-amber-400" /> Specialist Probers
            </h4>
            {[agents[2], agents[3], agents[4]].map((node) => (
              <div
                key={node.id}
                onClick={() => setSelectedNode(node)}
                className={`cursor-pointer p-4 rounded-xl border transition-all ${
                  selectedNode?.id === node.id
                    ? "border-amber-500 bg-amber-950/30 shadow-md shadow-amber-500/10"
                    : node.status === "found_exploit"
                    ? "border-red-500/40 bg-red-950/20"
                    : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-semibold text-xs text-white flex items-center gap-2">
                    <ShieldAlert
                      size={14}
                      className={node.status === "found_exploit" ? "text-red-400" : "text-amber-400"}
                    />
                    {node.name}
                  </span>
                  <span
                    className={`h-2 w-2 rounded-full ${
                      node.status === "found_exploit"
                        ? "bg-red-400 animate-pulse"
                        : node.status === "active"
                        ? "bg-amber-400 animate-ping"
                        : "bg-white/20"
                    }`}
                  />
                </div>
                <div className="text-[11px] text-white/50">{node.role}</div>
                <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-white/40 font-mono">
                  <span>Reqs: {node.requestsSent}</span>
                  {node.findingsCount > 0 ? (
                    <span className="text-red-400 font-bold">{node.findingsCount} Exploit Proven</span>
                  ) : (
                    <span>Status: {node.status.toUpperCase()}</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Column 3: PoC Validation & Inline Mitigation */}
          <div className="space-y-3">
            <h4 className="text-[11px] font-mono uppercase tracking-wider text-text-muted flex items-center gap-1.5">
              <Lock size={12} className="text-emerald-400" /> Defense & Mitigation
            </h4>
            {[agents[5], agents[6]].map((node) => (
              <div
                key={node.id}
                onClick={() => setSelectedNode(node)}
                className={`cursor-pointer p-4 rounded-xl border transition-all ${
                  selectedNode?.id === node.id
                    ? "border-emerald-500 bg-emerald-950/30 shadow-md shadow-emerald-500/10"
                    : node.id === "defense" && patchesCount > 0
                    ? "border-purple-500/40 bg-purple-950/20"
                    : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-semibold text-xs text-white flex items-center gap-2">
                    <Shield
                      size={14}
                      className={node.id === "defense" ? "text-purple-400" : "text-emerald-400"}
                    />
                    {node.name}
                  </span>
                  <span
                    className={`h-2 w-2 rounded-full ${
                      node.status === "found_exploit" || patchesCount > 0
                        ? "bg-emerald-400"
                        : "bg-white/20"
                    }`}
                  />
                </div>
                <div className="text-[11px] text-white/50">{node.role}</div>
                <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-white/40 font-mono">
                  <span>{node.id === "defense" ? "Mitigations: " + patchesCount : "PoCs: " + node.findingsCount}</span>
                  <span>Status: {node.status.toUpperCase()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Selected Node Inspector Drawer */}
        {selectedNode && (
          <div className="mt-6 pt-4 border-t border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white/[0.02] p-4 rounded-xl">
            <div className="space-y-1">
              <h5 className="text-sm font-bold text-white flex items-center gap-2">
                <Brain size={15} className="text-blue-400" />
                {selectedNode.name} • <span className="text-xs text-white/60 font-normal">{selectedNode.role}</span>
              </h5>
              <p className="text-xs text-white/70">{selectedNode.description}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[10px] font-mono px-2 py-1 rounded bg-white/10 text-white/70">
                Dispatched {selectedNode.requestsSent} probes
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
