"use client";

import React, { useState } from "react";
import { APIENDPOINT } from "@/config/Backend";
import {
  FileText,
  Download,
  ShieldCheck,
  Award,
  CheckCircle2,
  FileCode2,
  Lock,
  Layers,
  ExternalLink,
} from "lucide-react";

export default function ReportsPage() {
  const [downloading, setDownloading] = useState<string | null>(null);

  const handleDownloadReport = (type: "sarif" | "ciso" | "audit") => {
    setDownloading(type);
    setTimeout(() => {
      setDownloading(null);
      // Create mock download for demonstration or link to API
      const blob = new Blob(
        [
          type === "sarif"
            ? JSON.stringify({ version: "2.1.0", $schema: "https://docs.oasis-open.org/sarif/sarif/v2.1.0/cos02/schemas/sarif-schema-2.1.0.json" }, null, 2)
            : type === "ciso"
            ? "# Zerra Autonomous Security Validation Report\n\n## Executive Summary\nTarget: production-api\nPosture: Protected"
            : JSON.stringify({ audit_records: [], sha256_root: "a7c9f8..." }, null, 2),
        ],
        { type: type === "ciso" ? "text/markdown" : "application/json" }
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `zerra-security-${type}.${type === "ciso" ? "md" : "json"}`;
      a.click();
      URL.revokeObjectURL(url);
    }, 800);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-r from-indigo-950/40 via-zinc-900 to-black/80 p-6 backdrop-blur-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="flex h-2 w-2 rounded-full bg-indigo-400 animate-pulse" />
              <span className="text-xs font-semibold tracking-wider uppercase text-indigo-400">
                Enterprise Assurance & Audit
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <FileText className="h-6 w-6 text-indigo-400" />
              Compliance & Security Reporting Hub
            </h1>
            <p className="text-sm text-text-secondary mt-1 max-w-2xl">
              Export standardized OASIS SARIF 2.1.0 reports for CI/CD pipeline gating, CISO Executive Briefings for board governance, and tamper-evident cryptographic audit records.
            </p>
          </div>
        </div>
      </div>

      {/* Export Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* SARIF 2.1.0 Card */}
        <div className="rounded-2xl border border-border-default bg-bg-surface p-6 flex flex-col justify-between shadow-sm hover:border-border-strong transition-all">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <FileCode2 size={20} />
              </span>
              <span className="text-[10px] font-mono text-text-muted bg-bg-surface-sunken px-2 py-0.5 rounded">
                OASIS Standard
              </span>
            </div>
            <h3 className="text-base font-bold text-text-primary mb-1">OASIS SARIF 2.1.0</h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              Machine-readable Static Analysis Results Interchange Format. Native integration with GitHub Advanced Security, GitLab SAST, and DefectDojo.
            </p>
          </div>

          <button
            onClick={() => handleDownloadReport("sarif")}
            disabled={downloading === "sarif"}
            className="mt-6 w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-bg-surface-sunken border border-border-default hover:bg-bg-hover text-text-primary text-xs font-semibold transition-all"
          >
            <Download size={13} />
            <span>{downloading === "sarif" ? "Generating..." : "Download SARIF JSON"}</span>
          </button>
        </div>

        {/* CISO Executive Report */}
        <div className="rounded-2xl border border-border-default bg-bg-surface p-6 flex flex-col justify-between shadow-sm hover:border-border-strong transition-all">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                <Award size={20} />
              </span>
              <span className="text-[10px] font-mono text-text-muted bg-bg-surface-sunken px-2 py-0.5 rounded">
                Executive C-Level
              </span>
            </div>
            <h3 className="text-base font-bold text-text-primary mb-1">CISO Executive Briefing</h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              Comprehensive executive markdown & PDF briefing summarizing security posture, CVSS breakdown, verified PoC exploits, and active virtual patch remediations.
            </p>
          </div>

          <button
            onClick={() => handleDownloadReport("ciso")}
            disabled={downloading === "ciso"}
            className="mt-6 w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-bg-surface-sunken border border-border-default hover:bg-bg-hover text-text-primary text-xs font-semibold transition-all"
          >
            <Download size={13} />
            <span>{downloading === "ciso" ? "Generating..." : "Download Executive Report"}</span>
          </button>
        </div>

        {/* Cryptographic Audit Trail */}
        <div className="rounded-2xl border border-border-default bg-bg-surface p-6 flex flex-col justify-between shadow-sm hover:border-border-strong transition-all">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Lock size={20} />
              </span>
              <span className="text-[10px] font-mono text-text-muted bg-bg-surface-sunken px-2 py-0.5 rounded">
                Tamper-Evident
              </span>
            </div>
            <h3 className="text-base font-bold text-text-primary mb-1">Tamper-Evident Audit Trail</h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              Cryptographically hashed ledger recording every offensive probe, telemetry event, and virtual patch deployment for SOC 2 Type II compliance.
            </p>
          </div>

          <button
            onClick={() => handleDownloadReport("audit")}
            disabled={downloading === "audit"}
            className="mt-6 w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-bg-surface-sunken border border-border-default hover:bg-bg-hover text-text-primary text-xs font-semibold transition-all"
          >
            <Download size={13} />
            <span>{downloading === "audit" ? "Generating..." : "Download Audit Ledger"}</span>
          </button>
        </div>
      </div>

      {/* Compliance Framework Alignment */}
      <div className="rounded-2xl border border-border-default bg-bg-surface p-6 shadow-sm">
        <h2 className="text-base font-semibold text-text-primary mb-4 flex items-center gap-2">
          <ShieldCheck size={16} className="text-emerald-500" />
          Regulatory & Industry Benchmark Alignment
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-bg-surface-sunken border border-border-default space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-sm text-text-primary">OWASP API Security Top 10</span>
              <CheckCircle2 size={15} className="text-emerald-400" />
            </div>
            <p className="text-xs text-text-secondary">
              Autonomous coverage across BOLA, Broken Auth, BFLA, SSRF, and Resource Exhaustion.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-bg-surface-sunken border border-border-default space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-sm text-text-primary">SOC 2 Type II CC6 / CC7</span>
              <CheckCircle2 size={15} className="text-emerald-400" />
            </div>
            <p className="text-xs text-text-secondary">
              Continuous monitoring, behavioral anomaly detection, and tamper-evident audit logging.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-bg-surface-sunken border border-border-default space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-sm text-text-primary">ISO / IEC 27001:2022</span>
              <CheckCircle2 size={15} className="text-emerald-400" />
            </div>
            <p className="text-xs text-text-secondary">
              Control A.8.25 secure system development & automated vulnerability validation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
