"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Zap,
  Play,
  Terminal,
  ArrowRight,
  CheckCircle2,
  Lock,
  Layers,
  Activity,
  Cpu,
  Globe,
  Radio,
  FileCode2,
  Award,
  ChevronRight,
  ExternalLink,
  Flame,
  Check,
  RotateCcw,
  Sparkles,
  Menu,
  X,
} from "lucide-react";

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<"bola" | "auth" | "ssrf" | "mcp">("bola");
  const [simulatedMitigation, setSimulatedMitigation] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const skillsData = {
    bola: {
      title: "Broken Object Level Authorization (BOLA / IDOR)",
      owasp: "OWASP API1:2023",
      endpoint: "GET /api/v1/users/1042/financials",
      exploitSnippet: "curl -H 'Authorization: Bearer user_99_token' https://api.target.com/api/v1/users/1042/financials\n# Returns: HTTP 200 OK (Sensitive balance leaked)",
      patchSnippet: "Rule: virtual_patch\nPattern: /api/v1/users/*\nCondition: require_tenant_match = true\nAction: BLOCK (HTTP 403 Forbidden)",
      impact: "Prevents attackers from enumerating user IDs to exfiltrate private financial data across tenant boundaries.",
    },
    auth: {
      title: "Broken Authentication & Token Tampering",
      owasp: "OWASP API2:2023",
      endpoint: "POST /api/v1/orders/checkout",
      exploitSnippet: "curl -H 'Authorization: Bearer eyJhbGciOiJub25lIn0...' https://api.target.com/api/v1/orders/checkout\n# Returns: HTTP 200 OK (Unsigned 'none' algorithm accepted)",
      patchSnippet: "Rule: identity_revocation & jwt_validation\nReject: alg == 'none'\nAction: BLOCK (HTTP 401 Unauthorized)",
      impact: "Eliminates forged JWT signatures, expired session replay, and revoked identity credential leaks.",
    },
    ssrf: {
      title: "Server-Side Request Forgery (SSRF) & Cloud Metadata",
      owasp: "OWASP API7:2023",
      endpoint: "POST /api/v1/webhooks/deliver?url=http://169.254.169.254",
      exploitSnippet: "curl -d '{\"target\": \"http://169.254.169.254/latest/meta-data/\"}' https://api.target.com/webhook\n# Returns: HTTP 200 OK (IAM role credentials exfiltrated)",
      patchSnippet: "Rule: virtual_patch_block\nBlock: 169.254.0.0/16, 127.0.0.1, internal DNS\nAction: BLOCK (HTTP 403 Forbidden)",
      impact: "Shields AWS IMDSv2, Kubernetes node secrets, and internal microservice loopbacks from SSRF exfiltration.",
    },
    mcp: {
      title: "Agentic MCP & Autonomous Tool Injection",
      owasp: "OWASP LLM07:2025",
      endpoint: "POST /v1/agent/tools/invoke",
      exploitSnippet: "payload = {\"tool\": \"shell_exec\", \"params\": {\"cmd\": \"cat /etc/passwd\"}}\n# Returns: HTTP 200 OK (Autonomous agent hijacked via prompt injection)",
      patchSnippet: "Rule: agent_scope_contract\nScope: ReadOnlyCatalog, OrderSearch\nAction: BLOCK (Out of scope contract)",
      impact: "Enforces cryptographic scope contracts on AI agents and MCP servers, preventing unauthorized tool execution.",
    },
  };

  const currentSkill = skillsData[activeTab];

  return (
    <div className="min-h-screen bg-[#09090b] text-[#f4f4f5] selection:bg-blue-500/30 selection:text-blue-200">
      {/* Dynamic Background Glow & Grid Accent */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-gradient-to-tr from-blue-600/15 via-indigo-500/10 to-purple-600/15 blur-[140px] rounded-full" />
        <div className="absolute top-[45%] left-1/4 w-[500px] h-[400px] bg-emerald-500/5 blur-[160px] rounded-full" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:36px_36px]" />
      </div>

      {/* Top Navbar */}
      <header className="sticky top-0 z-50 w-full border-b border-white/[0.08] bg-[#09090b]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo & Status Badge */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform">
                Z
              </div>
              <span className="font-extrabold text-xl tracking-tight text-white">
                Zerra
              </span>
            </Link>

            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-medium text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Autonomous Engine v2.4
            </span>
          </div>

          {/* Nav Links */}
          <nav className="hidden md:flex items-center gap-8 text-xs font-medium text-zinc-400">
            <a href="#features" className="hover:text-white transition-colors">
              Platform Features
            </a>
            <a href="#pipeline" className="hover:text-white transition-colors">
              Offense-to-Defense
            </a>
            <a href="#skills" className="hover:text-white transition-colors">
              Attack Matrix
            </a>
            <a href="#compliance" className="hover:text-white transition-colors">
              Compliance & SARIF
            </a>
          </nav>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/login"
              className="text-xs font-medium text-zinc-300 hover:text-white px-3 py-2 transition-colors hidden sm:block"
            >
              Sign In
            </Link>
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-md shadow-blue-500/20 transition-all active:scale-[0.98]"
            >
              <span>Open Console</span>
              <ArrowRight size={13} />
            </Link>

            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-white/[0.08] bg-[#09090b]/95 backdrop-blur-2xl px-6 py-4 space-y-3 animate-in slide-in-from-top-2 duration-150">
            <a
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm text-zinc-300 hover:text-white py-1 transition-colors"
            >
              Platform Features
            </a>
            <a
              href="#pipeline"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm text-zinc-300 hover:text-white py-1 transition-colors"
            >
              Offense-to-Defense
            </a>
            <a
              href="#skills"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm text-zinc-300 hover:text-white py-1 transition-colors"
            >
              Attack Matrix
            </a>
            <a
              href="#compliance"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm text-zinc-300 hover:text-white py-1 transition-colors"
            >
              Compliance & SARIF
            </a>
            <div className="pt-2 border-t border-white/[0.08] flex items-center justify-between">
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="text-xs text-zinc-400 hover:text-white font-medium"
              >
                Sign In
              </Link>
              <Link
                href="/dashboard/security"
                onClick={() => setMobileMenuOpen(false)}
                className="text-xs text-blue-400 hover:text-blue-300 font-semibold"
              >
                AI Pentest Studio →
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 pt-20 pb-28 text-center space-y-8">
        {/* Eyebrow Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.1] text-xs font-medium text-blue-300 shadow-sm backdrop-blur-md">
          <Sparkles size={13} className="text-amber-400" />
          <span>The Next Frontier of Continuous Security Validation</span>
          <span className="text-zinc-500">|</span>
          <span className="text-zinc-400">Closed-Loop Defense</span>
        </div>

        {/* Hero Title */}
        <div className="space-y-4 max-w-4xl mx-auto">
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.1]">
            Autonomous AI Pentesting.{" "}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400">
              Instant Zero-Trust Defense.
            </span>
          </h1>
          <p className="text-base sm:text-lg text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            Zerra unites multi-agent offensive validation with real-time gateway mitigation. Vulnerabilities are proven with verified PoCs and instantly neutralized via inline Go Gateway virtual patches.
          </p>
        </div>

        {/* Hero CTAs */}
        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          <Link
            href="/dashboard/security"
            className="flex items-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-xl shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <Zap size={16} className="text-amber-300" />
            <span>Launch AI Pentest Studio</span>
            <ArrowRight size={15} />
          </Link>

          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-6 py-3.5 rounded-xl bg-white/[0.05] border border-white/[0.12] hover:bg-white/[0.08] hover:border-white/[0.2] text-white font-semibold text-sm transition-all"
          >
            <ShieldCheck size={16} className="text-emerald-400" />
            <span>Explore Security Console</span>
          </Link>
        </div>

        {/* Trust Badges */}
        <div className="pt-8 border-t border-white/[0.06] flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-xs font-mono text-zinc-500">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 size={13} className="text-emerald-400" /> OWASP Top 10 API Security
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 size={13} className="text-emerald-400" /> Model Context Protocol (MCP) Safe
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 size={13} className="text-emerald-400" /> OASIS SARIF 2.1.0 Compliant
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 size={13} className="text-emerald-400" /> SOC 2 Type II Architecture
          </span>
        </div>

        {/* Interactive Dual-Panel Product Showcase */}
        <div className="pt-12 text-left">
          <div className="rounded-2xl border border-white/[0.12] bg-[#121215]/90 p-5 sm:p-7 shadow-2xl backdrop-blur-2xl overflow-hidden relative">
            {/* Window Chrome Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-yellow-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
                <span className="text-xs font-mono text-zinc-400 ml-2">
                  zerra-autonomous-validation-session.sh
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-zinc-400 bg-white/[0.05] px-2 py-0.5 rounded border border-white/[0.08]">
                  Closed-Loop Demonstration
                </span>
              </div>
            </div>

            {/* Split Screen: Offense vs Defense */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
              {/* Left Column: Offensive Discovery & PoC */}
              <div className="space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Flame size={14} /> 1. Autonomous Exploit Synthesis
                  </span>
                  <span className="text-[10px] text-red-400 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20 font-bold">
                    VULNERABILITY PROVEN
                  </span>
                </div>

                <div className="rounded-xl border border-white/[0.08] bg-black/60 p-4 space-y-2.5">
                  <div className="text-zinc-500 text-[11px]">
                    # Specialist Agent: BOLA / IDOR Boundary Probe
                  </div>
                  <div className="text-zinc-300">
                    &gt; Mutating resource ID across tenant contexts...
                  </div>
                  <pre className="text-emerald-300 bg-white/[0.02] p-2.5 rounded border border-white/[0.05] overflow-x-auto">
                    {`curl -X GET "https://api.target.com/v1/tenants/42/keys" \\
  -H "Authorization: Bearer unprivileged_agent_token"`}
                  </pre>
                  <div className="text-zinc-400 text-[11px]">
                    Response Status: <span className="text-red-400 font-bold">HTTP 200 OK</span>
                    <br />
                    Indicator Matched: <code className="text-amber-300">"master_api_secret_key": "sec_99a..."</code>
                  </div>
                  <div className="text-[11px] text-zinc-500 border-t border-white/[0.05] pt-2">
                    Counterevidence Calibrator: <span className="text-blue-400">High Confidence</span> (Confirmed bypass of object authorization)
                  </div>
                </div>
              </div>

              {/* Right Column: Instant Gateway Virtual Patch */}
              <div className="space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Shield size={14} /> 2. Gateway Inline Neutralization
                  </span>
                  <button
                    onClick={() => setSimulatedMitigation(!simulatedMitigation)}
                    className={`text-[10px] px-2.5 py-1 rounded font-bold border transition-all ${
                      simulatedMitigation
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                        : "bg-blue-600 hover:bg-blue-500 text-white"
                    }`}
                  >
                    {simulatedMitigation ? "✓ Virtual Patch Enforced" : "Deploy 1-Click Mitigation"}
                  </button>
                </div>

                <div className="rounded-xl border border-white/[0.08] bg-black/60 p-4 space-y-2.5">
                  <div className="text-zinc-500 text-[11px]">
                    # Inline Go Gateway Policy: vp-bola-tenant-boundary
                  </div>
                  <pre className="text-purple-300 bg-white/[0.02] p-2.5 rounded border border-white/[0.05] overflow-x-auto">
                    {`Rule: virtual_patch_block
Target: /v1/tenants/*/keys
Condition: tenant_id != caller.tenant_id
Enforced Action: BLOCK`}
                  </pre>
                  <div className="text-zinc-400 text-[11px]">
                    Replayed Exploit Verdict:{" "}
                    {simulatedMitigation ? (
                      <span className="text-emerald-400 font-bold">
                        HTTP 403 Forbidden (Blocked Inline)
                      </span>
                    ) : (
                      <span className="text-amber-400 font-bold">
                        Awaiting Virtual Patch Deployment
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-zinc-500 border-t border-white/[0.05] pt-2">
                    Gateway Latency Overhead: <span className="text-emerald-400">&lt; 0.8ms</span> (Sub-millisecond Zero-Trust evaluation)
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: 4 Pillars of Superiority */}
        <div id="features" className="pt-24 text-left space-y-12">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Architected to Outperform Static Scanners
            </h2>
            <p className="text-sm text-zinc-400">
              Legacy security tools flag hundreds of hypothetical vulnerabilities without proof. Zerra validates every risk with an executable exploit and neutralizes it at the gateway.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 space-y-3 hover:border-blue-500/40 transition-all">
              <span className="p-3 rounded-xl bg-blue-500/10 text-blue-400 inline-block border border-blue-500/20">
                <Cpu size={20} />
              </span>
              <h3 className="text-base font-bold text-white">Dynamic Contract Fuzzing</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Ingests OpenAPI 3.x, Swagger 2.0, and GraphQL schemas to fuzz boundary parameters and discover undocumented shadow routes.
              </p>
            </div>

            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 space-y-3 hover:border-amber-500/40 transition-all">
              <span className="p-3 rounded-xl bg-amber-500/10 text-amber-400 inline-block border border-amber-500/20">
                <Terminal size={20} />
              </span>
              <h3 className="text-base font-bold text-white">100% Verifiable PoCs</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Zero false positives. Every validated vulnerability produces click-to-copy cURL and Python test artifacts that prove the vulnerability live.
              </p>
            </div>

            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 space-y-3 hover:border-emerald-500/40 transition-all">
              <span className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 inline-block border border-emerald-500/20">
                <Lock size={20} />
              </span>
              <h3 className="text-base font-bold text-white">Zero-Trust Virtual Patching</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Automatically synthesizes inline Go Gateway proxy filter rules. Protect your production microservices before developers write a line of code.
              </p>
            </div>

            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 space-y-3 hover:border-purple-500/40 transition-all">
              <span className="p-3 rounded-xl bg-purple-500/10 text-purple-400 inline-block border border-purple-500/20">
                <Award size={20} />
              </span>
              <h3 className="text-base font-bold text-white">OASIS SARIF & CISO Briefings</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Native SARIF 2.1.0 exports for GitHub Code Scanning, automated CISO Executive Briefings, and cryptographic audit ledgers.
              </p>
            </div>
          </div>
        </div>

        {/* Section 3: Interactive Attack Matrix */}
        <div id="skills" className="pt-24 text-left space-y-8">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Autonomous Attack Playbooks
            </h2>
            <p className="text-sm text-zinc-400">
              Explore how Zerra's specialist agents isolate, reproduce, and patch critical vulnerability classes.
            </p>
          </div>

          <div className="rounded-2xl border border-white/[0.1] bg-[#121215] p-6 sm:p-8 space-y-6">
            {/* Playbook Selector Tabs */}
            <div className="flex flex-wrap gap-2 border-b border-white/[0.08] pb-4">
              {[
                { key: "bola", label: "BOLA / IDOR (API1)" },
                { key: "auth", label: "Broken Auth (API2)" },
                { key: "ssrf", label: "SSRF & Cloud Metadata (API7)" },
                { key: "mcp", label: "Agentic MCP Security (LLM07)" },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as "bola" | "auth" | "ssrf" | "mcp")}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                    activeTab === tab.key
                      ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                      : "bg-white/[0.03] text-zinc-400 hover:text-white hover:bg-white/[0.06]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Playbook Content */}
            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    {currentSkill.owasp}
                  </span>
                  <h3 className="text-lg font-bold text-white">{currentSkill.title}</h3>
                </div>
                <p className="text-xs text-zinc-400 mt-1">{currentSkill.impact}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
                {/* Exploit PoC */}
                <div className="space-y-1.5 rounded-xl border border-red-500/20 bg-red-950/10 p-4">
                  <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider block">
                    Validated Offensive PoC
                  </span>
                  <pre className="text-red-200 overflow-x-auto whitespace-pre-wrap">
                    {currentSkill.exploitSnippet}
                  </pre>
                </div>

                {/* Gateway Patch */}
                <div className="space-y-1.5 rounded-xl border border-emerald-500/20 bg-emerald-950/10 p-4">
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
                    Synthesized Zero-Trust Virtual Patch
                  </span>
                  <pre className="text-emerald-200 overflow-x-auto whitespace-pre-wrap">
                    {currentSkill.patchSnippet}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Final Conversion Strip */}
        <div className="pt-24">
          <div className="rounded-3xl border border-blue-500/30 bg-gradient-to-br from-blue-950/40 via-indigo-950/30 to-black p-8 sm:p-14 text-center space-y-6 relative overflow-hidden shadow-2xl">
            <div className="space-y-3 max-w-2xl mx-auto">
              <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
                Close Your Security Exposure Gap Today
              </h2>
              <p className="text-sm sm:text-base text-zinc-400">
                Deploy Zerra to continuously probe your APIs, validate autonomous agent interactions, and enforce instant zero-trust gateway mitigations.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
              <Link
                href="/dashboard/security"
                className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-xl shadow-blue-500/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                Launch Free Autonomous Scan
              </Link>
              <Link
                href="/dashboard"
                className="px-8 py-3.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] text-white font-semibold text-sm transition-all"
              >
                Open Unified Dashboard
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.08] py-10 text-xs text-zinc-500">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-blue-600 flex items-center justify-center font-bold text-white text-xs">
              Z
            </div>
            <span className="font-semibold text-zinc-300">Zerra Security Inc.</span>
            <span>• Continuous Autonomous Validation & Zero-Trust Defense</span>
          </div>

          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="hover:text-zinc-300 transition-colors">
              Console
            </Link>
            <Link href="/dashboard/security" className="hover:text-zinc-300 transition-colors">
              Pentest Studio
            </Link>
            <Link href="/dashboard/policies" className="hover:text-zinc-300 transition-colors">
              Policies
            </Link>
            <Link href="/dashboard/reports" className="hover:text-zinc-300 transition-colors">
              Compliance (SARIF)
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
