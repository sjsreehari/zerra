"use client";

import React, { useState } from "react";
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
  GitBranch,
  Search,
  Bug,
  Bell,
  MessageCircle,
  Mail,
  Users,
  Code2,
  Cpu,
  Layers,
  Sparkles,
  Menu,
  X,
  Check,
  Flame,
  Award,
  ExternalLink,
} from "lucide-react";

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<"sast" | "secrets" | "sca" | "mcp">("sast");
  const [prSimulated, setPrSimulated] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const demoData = {
    sast: {
      category: "SAST • SQL Injection (CWE-89)",
      file: "internal/db/users.go:42",
      vulnSnippet: `// Vulnerable: Unsanitized SQL string concatenation\nquery := "SELECT * FROM users WHERE id = '" + userID + "'"\nrow := db.QueryRow(query)`,
      fixSnippet: `// Remediation: Parameterized query placeholder ($1)\nrow := db.QueryRow("SELECT * FROM users WHERE id = $1", userID)`,
      explanation: "Zerra detected unparameterized user input in SQL statement. Auto-PR replaces concatenation with safe $1 positional argument.",
      branch: "zerra/fix-cwe-89-users-go",
      severity: "CRITICAL",
      cvss: 9.8,
    },
    secrets: {
      category: "Secrets • Plaintext Stripe API Key (CWE-798)",
      file: "config/payments.py:14",
      vulnSnippet: `# Compromised: Hardcoded live Stripe secret key\nSTRIPE_SECRET_KEY = "sk_test_51NABC1234567890abcdefghijklmnopqrstuvwxyz"`,
      fixSnippet: `# Remediation: Load from secure environment variable\nimport os\nSTRIPE_SECRET_KEY = os.environ.get("STRIPE_SECRET_KEY")`,
      explanation: "Live production credential exposed in source tree. Auto-PR moves key to environment variable and alerts on WhatsApp & Discord.",
      branch: "zerra/fix-cwe-798-stripe-key",
      severity: "CRITICAL",
      cvss: 9.9,
    },
    sca: {
      category: "SCA • Vulnerable Dependency urllib3 (CVE-2023-45803)",
      file: "requirements.txt:18",
      vulnSnippet: `# Vulnerable: urllib3 < 2.0.7 leaks auth headers on redirect\nurllib3==1.26.15`,
      fixSnippet: `# Remediation: Upgrade to patched version\nurllib3>=2.0.7`,
      explanation: "Known supply-chain CVE with public exploit. Auto-PR bumps package version constraint and verifies compatibility.",
      branch: "zerra/fix-cve-2023-45803-urllib3",
      severity: "HIGH",
      cvss: 7.5,
    },
    mcp: {
      category: "AI Safety • Agentic Tool Injection (OWASP LLM07:2025)",
      file: "agents/orchestrator.py:68",
      vulnSnippet: `# Unchecked MCP tool invocation from LLM output\ntool_name = llm_response["tool"]\neval(f"tools.{tool_name}(**args)")`,
      fixSnippet: `# Strict whitelist validation and isolated execution\nALLOWED_TOOLS = {"search_catalog", "read_order"}\nif tool_name not in ALLOWED_TOOLS:\n    raise SecurityException("Untrusted MCP tool call blocked")`,
      explanation: "Protects autonomous LLM workflows from prompt injection and unauthorized tool execution.",
      branch: "zerra/fix-llm07-mcp-whitelist",
      severity: "HIGH",
      cvss: 8.4,
    },
  };

  const currentDemo = demoData[activeTab];

  return (
    <div className="min-h-screen bg-[#09090b] text-[#f4f4f5] selection:bg-blue-500/30 selection:text-blue-200">
      {/* Ambient Radial Background Glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-gradient-to-tr from-blue-600/15 via-indigo-500/10 to-purple-600/15 blur-[140px] rounded-full" />
        <div className="absolute top-[45%] left-1/4 w-[600px] h-[400px] bg-emerald-500/5 blur-[160px] rounded-full" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:36px_36px]" />
      </div>

      {/* Top Navbar */}
      <header className="sticky top-0 z-50 w-full border-b border-white/[0.08] bg-[#09090b]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
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
              Autonomous Security v2.0
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-xs font-medium text-zinc-400">
            <a href="#features" className="hover:text-white transition-colors">
              Features
            </a>
            <a href="#demo" className="hover:text-white transition-colors">
              Auto-PR Engine
            </a>
            <a href="#notifications" className="hover:text-white transition-colors">
              Alert Channels
            </a>
            <a href="#compliance" className="hover:text-white transition-colors">
              SARIF & Compliance
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <a
              href="https://github.com/sjsreehari/zerra"
              target="_blank"
              rel="noreferrer"
              className="text-xs font-medium text-zinc-300 hover:text-white px-3 py-2 transition-colors hidden sm:flex items-center gap-1.5"
            >
              <GitBranch size={14} />
              <span>GitHub</span>
            </a>
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-md shadow-blue-500/20 transition-all active:scale-[0.98]"
            >
              <span>Open Console</span>
              <ArrowRight size={13} />
            </Link>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5"
            >
              {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-white/[0.08] bg-[#09090b]/95 px-6 py-4 space-y-3">
            <a href="#features" onClick={() => setMobileMenuOpen(false)} className="block text-sm text-zinc-300">Features</a>
            <a href="#demo" onClick={() => setMobileMenuOpen(false)} className="block text-sm text-zinc-300">Auto-PR Engine</a>
            <a href="#notifications" onClick={() => setMobileMenuOpen(false)} className="block text-sm text-zinc-300">Alert Channels</a>
            <Link href="/dashboard" className="block text-sm text-blue-400 font-semibold">Open Console →</Link>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 pt-20 pb-28 text-center space-y-8">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.1] text-xs font-medium text-blue-300 shadow-sm backdrop-blur-md">
          <Sparkles size={13} className="text-amber-400" />
          <span>Continuous Git Repository Security</span>
          <span className="text-zinc-500">|</span>
          <span className="text-zinc-400">Zero-Human-Toil Auto-PRs</span>
        </div>

        <div className="space-y-4 max-w-4xl mx-auto">
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white leading-[1.1]">
            Autonomous Repo Security.{" "}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-300 to-emerald-400">
              Instant Auto-PR Defense.
            </span>
          </h1>
          <p className="text-base sm:text-lg text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            Give Zerra any Git repository. It scans every commit and PR across SAST, dependency CVEs, and secret leaks, automatically opens verified remediation Pull Requests, and dispatches real-time alerts across WhatsApp, Discord, Teams, and Email.
          </p>
        </div>

        {/* Hero CTAs */}
        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          <Link
            href="/dashboard/repositories"
            className="flex items-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-xl shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <GitBranch size={16} className="text-white" />
            <span>Connect Repository</span>
            <ArrowRight size={15} />
          </Link>

          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-6 py-3.5 rounded-xl bg-white/[0.05] border border-white/[0.12] hover:bg-white/[0.08] hover:border-white/[0.2] text-white font-semibold text-sm transition-all"
          >
            <ShieldCheck size={16} className="text-emerald-400" />
            <span>Explore Console</span>
          </Link>
        </div>

        {/* Multi-Channel Alerts Marquee */}
        <div className="pt-8 border-t border-white/[0.06] flex flex-wrap items-center justify-center gap-4 text-xs font-mono text-zinc-400">
          <span className="text-zinc-500">Incident Alert Channels:</span>
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <MessageCircle size={13} /> WhatsApp Cloud API
          </span>
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <Zap size={13} /> Discord Webhook
          </span>
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400">
            <Users size={13} /> Microsoft Teams
          </span>
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400">
            <Mail size={13} /> SMTP Email
          </span>
        </div>

        {/* Interactive Dual-Panel Auto-PR Engine Showcase */}
        <div id="demo" className="pt-12 text-left">
          <div className="rounded-2xl border border-white/[0.12] bg-[#121215]/90 p-5 sm:p-7 shadow-2xl backdrop-blur-2xl overflow-hidden relative">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-white/[0.08] gap-3">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-yellow-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
                <span className="text-xs font-mono text-zinc-400 ml-2">
                  zerra-autonomous-remediation-engine.sh
                </span>
              </div>

              {/* Selector Tabs */}
              <div className="flex items-center gap-1 bg-white/[0.04] p-1 rounded-xl border border-white/[0.08]">
                {[
                  { key: "sast", label: "SQL Injection" },
                  { key: "secrets", label: "Stripe Secret" },
                  { key: "sca", label: "CVE Dependency" },
                  { key: "mcp", label: "Agentic MCP" },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => {
                      setActiveTab(tab.key as any);
                      setPrSimulated(false);
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                      activeTab === tab.key
                        ? "bg-blue-600 text-white shadow-sm"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Split Screen: Vulnerability vs Auto-PR */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
              {/* Left Column: Finding Details */}
              <div className="space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-red-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Flame size={14} /> 1. Real-time Detection
                  </span>
                  <span className="text-[10px] text-red-400 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20 font-bold">
                    CVSS {currentDemo.cvss} • {currentDemo.severity}
                  </span>
                </div>

                <div className="rounded-xl border border-white/[0.08] bg-black/60 p-4 space-y-2.5">
                  <div className="text-zinc-400 text-[11px] flex items-center justify-between">
                    <span>{currentDemo.category}</span>
                    <code className="text-blue-400">{currentDemo.file}</code>
                  </div>
                  <pre className="text-red-300 bg-white/[0.02] p-3 rounded-lg border border-red-500/20 overflow-x-auto whitespace-pre-wrap">
                    {currentDemo.vulnSnippet}
                  </pre>
                  <p className="text-[11px] text-zinc-400 border-t border-white/[0.05] pt-2">
                    {currentDemo.explanation}
                  </p>
                </div>
              </div>

              {/* Right Column: Automated Fix PR */}
              <div className="space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    <GitBranch size={14} /> 2. Automated Remediation PR
                  </span>
                  <button
                    onClick={() => setPrSimulated(!prSimulated)}
                    className={`text-[11px] px-3 py-1 rounded-lg font-bold border transition-all ${
                      prSimulated
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                        : "bg-emerald-600 hover:bg-emerald-500 text-white"
                    }`}
                  >
                    {prSimulated ? "✓ PR Opened on GitHub" : "Click to Create PR 🚀"}
                  </button>
                </div>

                <div className="rounded-xl border border-white/[0.08] bg-black/60 p-4 space-y-2.5">
                  <div className="text-zinc-400 text-[11px] flex items-center justify-between">
                    <span>Branch: <code className="text-emerald-400">{currentDemo.branch}</code></span>
                    <span className="text-emerald-400 font-bold">Base: main</span>
                  </div>
                  <pre className="text-emerald-300 bg-white/[0.02] p-3 rounded-lg border border-emerald-500/20 overflow-x-auto whitespace-pre-wrap">
                    {currentDemo.fixSnippet}
                  </pre>
                  <div className="text-[11px] text-zinc-400 border-t border-white/[0.05] pt-2 flex items-center justify-between">
                    <span>
                      Alert Status:{" "}
                      <strong className="text-emerald-400">
                        {prSimulated ? "Dispatched to WhatsApp & Discord" : "Ready to Dispatch"}
                      </strong>
                    </span>
                    <span className="text-blue-400">Auto-Remediated in 1.4s</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 4 Pillars of Continuous Security */}
        <div id="features" className="pt-24 text-left space-y-12">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Full-Spectrum Autonomous Git Security
            </h2>
            <p className="text-sm text-zinc-400">
              Unlike static scanners that generate noisy PDF reports, Zerra actively remediates vulnerabilities by committing working code directly to your repositories.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 space-y-3 hover:border-blue-500/40 transition-all">
              <span className="p-3 rounded-xl bg-blue-500/10 text-blue-400 inline-block border border-blue-500/20">
                <Code2 size={20} />
              </span>
              <h3 className="text-base font-bold text-white">Rule-Based AST SAST</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Detects SQL injection, OS command execution, XSS, path traversal, and unsafe deserialization across Python, Go, TypeScript, Java, and Docker.
              </p>
            </div>

            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 space-y-3 hover:border-amber-500/40 transition-all">
              <span className="p-3 rounded-xl bg-amber-500/10 text-amber-400 inline-block border border-amber-500/20">
                <ShieldAlert size={20} />
              </span>
              <h3 className="text-base font-bold text-white">25+ Secret Detectors</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Regex and Shannon entropy analysis catches AWS keys, Stripe tokens, GitHub PATs, Slack webhooks, private keys, and high-entropy API secrets before merge.
              </p>
            </div>

            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 space-y-3 hover:border-emerald-500/40 transition-all">
              <span className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 inline-block border border-emerald-500/20">
                <GitBranch size={20} />
              </span>
              <h3 className="text-base font-bold text-white">Automated Fix PRs</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Synthesizes patches, branches off `main`, commits corrected code, and opens a GitHub Pull Request with explanations and CVSS impact.
              </p>
            </div>

            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 space-y-3 hover:border-purple-500/40 transition-all">
              <span className="p-3 rounded-xl bg-purple-500/10 text-purple-400 inline-block border border-purple-500/20">
                <Award size={20} />
              </span>
              <h3 className="text-base font-bold text-white">OASIS SARIF 2.1.0</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Industry-standard SARIF export compatible with GitHub Code Scanning alerts, GitLab Security Dashboards, and automated CI/CD gating.
              </p>
            </div>
          </div>
        </div>

        {/* Multi-Channel Alerts Showcase Section */}
        <div id="notifications" className="pt-24 text-left space-y-8">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Push Alerts Straight to Your Incident Channels
            </h2>
            <p className="text-sm text-zinc-400">
              When a critical vulnerability is pushed, your on-call engineering team is notified in seconds via their preferred communication channel.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-950/10 p-5 space-y-3">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <MessageCircle size={18} /> WhatsApp Alerts
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Direct WhatsApp messages via Meta Cloud API with repository name, vulnerability count, and 1-click PR review links.
              </p>
            </div>

            <div className="rounded-2xl border border-indigo-500/20 bg-indigo-950/10 p-5 space-y-3">
              <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm">
                <Zap size={18} /> Discord Webhooks
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Rich color-coded embeds with severity badges, CVSS scores, code snippets, and author attribution.
              </p>
            </div>

            <div className="rounded-2xl border border-blue-500/20 bg-blue-950/10 p-5 space-y-3">
              <div className="flex items-center gap-2 text-blue-400 font-bold text-sm">
                <Users size={18} /> Microsoft Teams
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Enterprise Adaptive Cards formatted with collapsible details, facts tables, and action buttons for SOC workflows.
              </p>
            </div>

            <div className="rounded-2xl border border-purple-500/20 bg-purple-950/10 p-5 space-y-3">
              <div className="flex items-center gap-2 text-purple-400 font-bold text-sm">
                <Mail size={18} /> Email Reports
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Clean HTML security digests with executive posture summary and tabular findings sent via SMTP.
              </p>
            </div>
          </div>
        </div>

        {/* Final CTA Strip */}
        <div className="pt-24">
          <div className="rounded-3xl border border-blue-500/30 bg-gradient-to-br from-blue-950/40 via-indigo-950/30 to-black p-8 sm:p-14 text-center space-y-6 relative overflow-hidden shadow-2xl">
            <div className="space-y-3 max-w-2xl mx-auto">
              <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
                Secure Your Repositories Autonomously
              </h2>
              <p className="text-sm sm:text-base text-zinc-400">
                Connect your GitHub repository and let Zerra autonomously audit your code on every push and pull request.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
              <Link
                href="/dashboard/repositories"
                className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-xl shadow-blue-500/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                Connect Your First Repo
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
            <span className="font-semibold text-zinc-300">Zerra Security</span>
            <span>• Autonomous Continuous Security & Auto-PR Platform</span>
          </div>

          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="hover:text-zinc-300 transition-colors">Console</Link>
            <Link href="/dashboard/repositories" className="hover:text-zinc-300 transition-colors">Repositories</Link>
            <Link href="/dashboard/scans" className="hover:text-zinc-300 transition-colors">Scans</Link>
            <Link href="/dashboard/findings" className="hover:text-zinc-300 transition-colors">Findings</Link>
            <Link href="/dashboard/notifications" className="hover:text-zinc-300 transition-colors">Notifications</Link>
            <a href="https://github.com/sjsreehari/zerra" target="_blank" rel="noreferrer" className="hover:text-zinc-300 transition-colors">GitHub</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
