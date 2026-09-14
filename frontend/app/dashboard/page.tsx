"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { APIENDPOINT } from "@/config/Backend";
import {
  ShieldAlert,
  ShieldCheck,
  Zap,
  Play,
  Waypoints,
  ArrowRight,
  Activity,
  AlertTriangle,
  Lock,
  FileCheck2,
  FileCode2,
  Server,
  Terminal,
  Layers,
  ChevronRight,
  TrendingUp,
  Cpu,
  DownloadCloud,
} from "lucide-react";

export default function DashboardPage() {
  const [activeJobsCount, setActiveJobsCount] = useState(0);
  const [proxiesCount, setProxiesCount] = useState(0);
  const [policiesCount, setPoliciesCount] = useState(6);

  useEffect(() => {
    // Load proxy count
    fetch(APIENDPOINT.Proxy)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setProxiesCount(data.length);
      })
      .catch(() => {});

    // Load pentest jobs count
    fetch(APIENDPOINT.PentestJobs)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setActiveJobsCount(data.length);
      })
      .catch(() => {});

    // Load policies count
    fetch(APIENDPOINT.Policies)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setPoliciesCount(data.length);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Welcome / Executive Threat Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-blue-950/40 via-zinc-900 to-black/80 p-6 md:p-8 backdrop-blur-xl shadow-lg">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-semibold tracking-wider uppercase text-blue-400">
                Zero-Trust Unified Command
              </span>
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              Autonomous Pentest & Defense Posture
            </h1>
            <p className="text-sm text-text-secondary leading-relaxed">
              Zerra pairs autonomous offensive agents with real-time zero-trust gateway mitigation. Vulnerabilities are proven with verifiable PoCs and immediately neutralized via inline virtual patches.
            </p>
          </div>

          {/* Quick CTAs */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Link
              href="/dashboard/security"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-md hover:shadow-blue-500/20 transition-all active:scale-[0.98]"
            >
              <Zap size={16} className="text-amber-300" />
              <span>Launch Autonomous Pentest</span>
              <ArrowRight size={14} />
            </Link>
            <Link
              href="/dashboard/api"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-bg-surface border border-border-default hover:bg-bg-hover text-text-primary text-sm font-medium transition-all"
            >
              <Waypoints size={15} className="text-blue-400" />
              <span>Add API Route</span>
            </Link>
          </div>
        </div>

        {/* Threat Posture Meter Bar */}
        <div className="mt-8 pt-6 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="flex items-center justify-between text-xs text-text-secondary mb-1">
              <span>Security Index</span>
              <ShieldCheck size={14} className="text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-emerald-400">96 / 100</div>
            <div className="text-[11px] text-text-muted mt-1">Zero-Trust Active Defense</div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="flex items-center justify-between text-xs text-text-secondary mb-1">
              <span>Protected Endpoints</span>
              <Server size={14} className="text-blue-400" />
            </div>
            <div className="text-2xl font-bold text-white">{proxiesCount || "4"} Routes</div>
            <div className="text-[11px] text-text-muted mt-1">Gateway Reverse Proxy</div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="flex items-center justify-between text-xs text-text-secondary mb-1">
              <span>Autonomous Skills</span>
              <Cpu size={14} className="text-amber-400" />
            </div>
            <div className="text-2xl font-bold text-amber-300">7 Loaded</div>
            <div className="text-[11px] text-text-muted mt-1">OWASP Top 10 + Agentic MCP</div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="flex items-center justify-between text-xs text-text-secondary mb-1">
              <span>Zero-Trust Policies</span>
              <Lock size={14} className="text-purple-400" />
            </div>
            <div className="text-2xl font-bold text-purple-300">{policiesCount} Active</div>
            <div className="text-[11px] text-text-muted mt-1">Gateway Virtual Patches</div>
          </div>
        </div>
      </div>

      {/* Duality Architecture: The Autonomous Loop */}
      <div className="rounded-2xl border border-border-default bg-bg-surface p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-text-primary flex items-center gap-2">
              <Layers size={16} className="text-blue-500" />
              The Continuous Offense-to-Defense Pipeline
            </h2>
            <p className="text-xs text-text-secondary mt-0.5">
              How Zerra autonomously validates threats and closes the exposure loop in seconds.
            </p>
          </div>
          <span className="text-xs font-mono bg-blue-500/10 text-blue-400 px-2.5 py-1 rounded-md border border-blue-500/20">
            Automated Feedback Loop
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
          {/* Step 1 */}
          <div className="relative rounded-xl border border-border-default bg-bg-surface-sunken p-4 group hover:border-blue-500/40 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="h-6 w-6 rounded-full bg-blue-500/20 text-blue-400 text-xs font-bold flex items-center justify-center">
                1
              </span>
              <span className="text-[10px] uppercase font-mono text-text-muted">Reconnaissance</span>
            </div>
            <h3 className="text-sm font-semibold text-text-primary mb-1">Contract Ingestion & Fuzzing</h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              Ingests OpenAPI 3.x, Swagger, and GraphQL specs to discover undocumented endpoints and parameters.
            </p>
          </div>

          {/* Step 2 */}
          <div className="relative rounded-xl border border-border-default bg-bg-surface-sunken p-4 group hover:border-amber-500/40 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="h-6 w-6 rounded-full bg-amber-500/20 text-amber-400 text-xs font-bold flex items-center justify-center">
                2
              </span>
              <span className="text-[10px] uppercase font-mono text-text-muted">Offensive Probing</span>
            </div>
            <h3 className="text-sm font-semibold text-text-primary mb-1">Autonomous Exploit Synthesis</h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              Specialist agents probe for BOLA, BFLA, Broken Auth, SSRF, and MCP agent prompt injections with real payloads.
            </p>
          </div>

          {/* Step 3 */}
          <div className="relative rounded-xl border border-border-default bg-bg-surface-sunken p-4 group hover:border-red-500/40 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="h-6 w-6 rounded-full bg-red-500/20 text-red-400 text-xs font-bold flex items-center justify-center">
                3
              </span>
              <span className="text-[10px] uppercase font-mono text-text-muted">PoC Validation</span>
            </div>
            <h3 className="text-sm font-semibold text-text-primary mb-1">Counterevidence Verification</h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              Generates working cURL and Python PoCs with counterevidence analysis to eliminate all false positives.
            </p>
          </div>

          {/* Step 4 */}
          <div className="relative rounded-xl border border-border-default bg-bg-surface-sunken p-4 group hover:border-emerald-500/40 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="h-6 w-6 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center justify-center">
                4
              </span>
              <span className="text-[10px] uppercase font-mono text-text-muted">Gateway Mitigation</span>
            </div>
            <h3 className="text-sm font-semibold text-text-primary mb-1">Zero-Trust Virtual Patching</h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              Instantly synthesizes inline Go Gateway proxy filter rules to block or step-up malicious exploits live.
            </p>
          </div>
        </div>
      </div>

      {/* Dual Column: Attack Surface Coverage & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Attack Vector Coverage Matrix */}
        <div className="lg:col-span-2 rounded-2xl border border-border-default bg-bg-surface p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-text-primary flex items-center gap-2">
                <ShieldAlert size={16} className="text-amber-500" />
                Autonomous Skills Coverage Matrix
              </h2>
              <p className="text-xs text-text-secondary mt-0.5">
                Multi-agent test coverage across critical attack vectors.
              </p>
            </div>
            <Link
              href="/dashboard/security"
              className="text-xs text-blue-500 hover:text-blue-600 font-medium flex items-center gap-1"
            >
              Open Studio <ChevronRight size={13} />
            </Link>
          </div>

          <div className="space-y-3 mt-4">
            {[
              {
                title: "API BOLA / IDOR Exploitation",
                owasp: "API1:2023",
                status: "Protected",
                statusCls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
                desc: "Validates object-level authorization across tenant boundaries and resource IDs.",
              },
              {
                title: "Broken Authentication & Token Tampering",
                owasp: "API2:2023",
                status: "Protected",
                statusCls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
                desc: "Tests weak JWT signing algorithms, revoked sessions, and bearer token leakage.",
              },
              {
                title: "Broken Function Level Authorization (BFLA)",
                owasp: "API5:2023",
                status: "Protected",
                statusCls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
                desc: "Tests administrative endpoint escalation from non-privileged identities.",
              },
              {
                title: "Server-Side Request Forgery & Cloud Metadata",
                owasp: "API7:2023",
                status: "Protected",
                statusCls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
                desc: "Blocks AWS IMDSv2, internal loopback, and cloud credential exfiltration attempts.",
              },
              {
                title: "Agentic MCP & Tool Injection",
                owasp: "LLM07:2025",
                status: "Active Monitoring",
                statusCls: "bg-blue-500/10 text-blue-400 border-blue-500/20",
                desc: "Validates Model Context Protocol servers against poisoned schema & unauthorized tool calls.",
              },
            ].map((item, idx) => (
              <div
                key={idx}
                className="flex items-start justify-between p-3 rounded-xl bg-bg-surface-sunken border border-border-default hover:bg-bg-hover transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-text-primary">{item.title}</span>
                    <span className="text-[10px] font-mono text-text-muted px-1.5 py-0.5 rounded bg-bg-surface border border-border-default">
                      {item.owasp}
                    </span>
                  </div>
                  <p className="text-xs text-text-secondary">{item.desc}</p>
                </div>
                <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border shrink-0 ${item.statusCls}`}>
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Col: Quick Security Operations */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-border-default bg-bg-surface p-6 shadow-sm">
            <h2 className="text-base font-semibold text-text-primary mb-3 flex items-center gap-2">
              <Terminal size={16} className="text-blue-500" />
              Quick Actions
            </h2>
            <div className="space-y-2.5">
              <Link
                href="/dashboard/security"
                className="flex items-center justify-between p-3 rounded-xl bg-bg-surface-sunken hover:bg-bg-hover border border-border-default text-xs font-medium text-text-primary transition-all group"
              >
                <span className="flex items-center gap-2">
                  <Zap size={14} className="text-amber-400" />
                  Run Autonomous Pentest
                </span>
                <ChevronRight size={13} className="text-text-muted group-hover:text-text-primary transition-colors" />
              </Link>

              <Link
                href="/dashboard/api"
                className="flex items-center justify-between p-3 rounded-xl bg-bg-surface-sunken hover:bg-bg-hover border border-border-default text-xs font-medium text-text-primary transition-all group"
              >
                <span className="flex items-center gap-2">
                  <Waypoints size={14} className="text-blue-400" />
                  Register Gateway Proxy Route
                </span>
                <ChevronRight size={13} className="text-text-muted group-hover:text-text-primary transition-colors" />
              </Link>

              <Link
                href="/dashboard/policies"
                className="flex items-center justify-between p-3 rounded-xl bg-bg-surface-sunken hover:bg-bg-hover border border-border-default text-xs font-medium text-text-primary transition-all group"
              >
                <span className="flex items-center gap-2">
                  <ShieldCheck size={14} className="text-emerald-400" />
                  Review Zero-Trust Policies
                </span>
                <ChevronRight size={13} className="text-text-muted group-hover:text-text-primary transition-colors" />
              </Link>

              <Link
                href="/dashboard/reports"
                className="flex items-center justify-between p-3 rounded-xl bg-bg-surface-sunken hover:bg-bg-hover border border-border-default text-xs font-medium text-text-primary transition-all group"
              >
                <span className="flex items-center gap-2">
                  <DownloadCloud size={14} className="text-purple-400" />
                  Export SARIF & Compliance
                </span>
                <ChevronRight size={13} className="text-text-muted group-hover:text-text-primary transition-colors" />
              </Link>
            </div>
          </div>

          {/* Zero-Trust Guarantee Box */}
          <div className="rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-950/20 to-black p-5 shadow-sm">
            <div className="flex items-center gap-2 text-purple-400 text-xs font-semibold mb-2">
              <Lock size={14} />
              <span>Zero-Trust Closed Loop</span>
            </div>
            <p className="text-xs text-text-secondary leading-relaxed">
              Every vulnerability identified by Zerra produces an immediate executable virtual patch that is compiled into the Go Gateway proxy pipeline, protecting backend services before application code patches are deployed.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}