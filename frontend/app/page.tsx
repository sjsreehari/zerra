"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Copy,
  GitBranch,
  GitCommit,
  GitPullRequest,
  Lock,
  Menu,
  Minus,
  Plus,
  ShieldCheck,
  Sparkles,
  Star,
  X,
  Zap,
  Loader2,
} from "lucide-react";

export default function HomePage() {
  // Mobile navigation menu toggle
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // First card ("auto-pr") is expanded on loading by default, and can be shrunk
  const [openCard, setOpenCard] = useState<string | null>("auto-pr");
  const [fixedState, setFixedState] = useState(false);
  const [prCreated, setPrCreated] = useState(false);
  const [copied, setCopied] = useState(false);

  // Waitlist modal state
  const [showWaitlist, setShowWaitlist] = useState(false);
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [waitlistResult, setWaitlistResult] = useState<{
    position: number;
    alreadyRegistered?: boolean;
    message: string;
  } | null>(null);
  const [waitlistError, setWaitlistError] = useState<string | null>(null);

  // Live access spot state fetched from server API
  const [nextSpot, setNextSpot] = useState<number | null>(null);

  useEffect(() => {
    // Fetch live waitlist count from server API
    fetch("/api/waitlist")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && typeof data.nextSpot === "number") {
          setNextSpot(data.nextSpot);
        }
      })
      .catch((err) => console.warn("Could not load waitlist count:", err));
  }, []);

  const copyInstallCmd = () => {
    navigator.clipboard.writeText("npx zerra init");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWaitlistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsSubmitting(true);
    setWaitlistError(null);

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setWaitlistError(data.error || "Failed to join waitlist. Please try again.");
      } else {
        setWaitlistResult({
          position: data.position,
          alreadyRegistered: data.alreadyRegistered,
          message: data.message,
        });
        if (!data.alreadyRegistered && nextSpot !== null && data.position >= nextSpot) {
          setNextSpot(data.position + 1);
        }
      }
    } catch (err) {
      setWaitlistError("Network connection interrupted. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F8FA] text-[#111827] font-sans antialiased selection:bg-[#FF6B53] selection:text-white">
      {/* Top Navbar */}
      <header className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-10 pt-6 sm:pt-8 pb-5 flex items-center justify-between relative">
        {/* Brand Logo with Eclipse Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-xl bg-black border-2 border-black flex items-center justify-center overflow-hidden shadow-[2px_2px_0px_#FF6B53] group-hover:scale-105 transition-transform">
            <img
              src="/images/logo.png"
              alt="Zerra Eclipse Logo"
              className="w-full h-full object-cover"
            />
          </div>
          <span className="font-extrabold text-2xl tracking-tight text-black">
            zerra
          </span>
        </Link>

        {/* Center Nav Links - Desktop */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-neutral-600">
          <a href="#how-it-works" className="hover:text-black transition-colors">
            How it works
          </a>
          <a href="#features" className="hover:text-black transition-colors">
            Local engine
          </a>
          <a href="#integrations" className="hover:text-black transition-colors">
            Integrations
          </a>
          <a
            href="https://github.com/sjsreehari/zerra/blob/main/docs/ARCHITECTURE.md"
            target="_blank"
            rel="noreferrer"
            className="hover:text-black transition-colors"
          >
            Docs & Architecture
          </a>
        </nav>

        {/* Right CTA Links - Join Waitlist & Colored Star Button */}
        <div className="hidden sm:flex items-center gap-3">
          <button
            onClick={() => {
              setWaitlistResult(null);
              setWaitlistError(null);
              setShowWaitlist(true);
            }}
            className="px-4 py-2.5 text-xs font-bold text-black border-2 border-black rounded-xl bg-white hover:bg-neutral-50 shadow-[2px_2px_0px_#111] hover:shadow-[1px_1px_0px_#111] hover:translate-x-[1px] hover:translate-y-[1px] transition-all flex items-center gap-2"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Join Waitlist</span>
          </button>

          {/* Colored Star Button */}
          <a
            href="https://github.com/sjsreehari/zerra"
            target="_blank"
            rel="noreferrer"
            className="px-4 py-2.5 text-xs font-black text-black border-2 border-black rounded-xl bg-[#FFE838] hover:bg-[#FFD600] shadow-[3px_3px_0px_#111] hover:shadow-[1px_1px_0px_#111] hover:translate-x-[2px] hover:translate-y-[2px] transition-all flex items-center gap-1.5"
          >
            <Star size={14} className="fill-black text-black" />
            <span>Star on GitHub</span>
          </a>
        </div>

        {/* Mobile Action Buttons */}
        <div className="flex sm:hidden items-center gap-2">
          <button
            onClick={() => {
              setWaitlistResult(null);
              setWaitlistError(null);
              setShowWaitlist(true);
            }}
            className="px-3 py-1.5 text-xs font-bold text-black border-2 border-black rounded-lg bg-white shadow-[2px_2px_0px_#111]"
          >
            Join Waitlist
          </button>
          <a
            href="https://github.com/sjsreehari/zerra"
            target="_blank"
            rel="noreferrer"
            className="p-2 border-2 border-black rounded-xl bg-[#FFE838] shadow-[2px_2px_0px_#111] text-black"
            aria-label="Star on GitHub"
          >
            <Star size={16} className="fill-black text-black" />
          </a>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 border-2 border-black rounded-xl bg-white shadow-[2px_2px_0px_#111] text-black"
            aria-label="Toggle Navigation"
          >
            {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="absolute top-full left-4 right-4 z-40 bg-white border-2 border-black rounded-2xl p-5 shadow-[6px_6px_0px_#111] flex flex-col gap-4 mt-2 sm:hidden animate-in fade-in duration-150">
            <a
              href="#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="text-sm font-bold text-neutral-800 hover:text-black py-1"
            >
              How it works
            </a>
            <a
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="text-sm font-bold text-neutral-800 hover:text-black py-1"
            >
              Local engine
            </a>
            <a
              href="#integrations"
              onClick={() => setMobileMenuOpen(false)}
              className="text-sm font-bold text-neutral-800 hover:text-black py-1"
            >
              Integrations
            </a>
            <a
              href="https://github.com/sjsreehari/zerra/blob/main/docs/ARCHITECTURE.md"
              target="_blank"
              rel="noreferrer"
              onClick={() => setMobileMenuOpen(false)}
              className="text-sm font-bold text-neutral-800 hover:text-black py-1"
            >
              Docs & Architecture
            </a>
            <div className="pt-2 border-t border-neutral-200 flex flex-col gap-2">
              <a
                href="https://github.com/sjsreehari/zerra"
                target="_blank"
                rel="noreferrer"
                className="w-full py-2.5 text-center text-xs font-black text-black border-2 border-black rounded-xl bg-[#FFE838] shadow-[2px_2px_0px_#111] flex items-center justify-center gap-1.5"
              >
                <Star size={14} className="fill-black text-black" />
                <span>Star on GitHub</span>
              </a>
            </div>
          </div>
        )}
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-10 pt-4 sm:pt-8 pb-20 space-y-12 sm:space-y-16">
        {/* Hero Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end">
          {/* Giant Title */}
          <div className="lg:col-span-8">
            <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-[80px] xl:text-[84px] font-black text-black tracking-[-0.03em] leading-[1.04]">
              Security that <br />
              checks every commit
            </h1>
          </div>

          {/* Subtitle & Quick CTAs */}
          <div className="lg:col-span-4 space-y-5 pb-2">
            <p className="text-sm sm:text-base text-neutral-700 leading-relaxed font-normal">
              Your autonomous blue-team security engineer running strictly on your local machine. It tests every commit in isolated Docker sandboxes, fixes vulnerabilities with a 1-click button, and opens verified Pull Requests on push.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
              <button
                onClick={() => {
                  setWaitlistResult(null);
                  setWaitlistError(null);
                  setShowWaitlist(true);
                }}
                className="px-6 py-3.5 bg-black hover:bg-neutral-800 text-white font-bold text-sm rounded-xl shadow-[4px_4px_0px_#FF6B53] hover:shadow-[2px_2px_0px_#FF6B53] hover:translate-x-[2px] hover:translate-y-[2px] transition-all inline-flex items-center justify-center gap-2"
              >
                <span>Join the Waitlist</span>
                <ArrowRight size={15} />
              </button>

              <button
                onClick={copyInstallCmd}
                className="px-4 py-3.5 bg-white border-2 border-black text-black font-mono text-xs font-semibold rounded-xl shadow-[3px_3px_0px_#111] hover:shadow-[1px_1px_0px_#111] hover:translate-x-[2px] hover:translate-y-[2px] transition-all inline-flex items-center justify-center gap-2"
              >
                {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                <span>npx zerra init</span>
              </button>
            </div>
          </div>
        </div>

        {/* Feature Cards Grid (Neo-Brutalist Layout) */}
        <div id="features" className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Big Feature Card with Exact Reverted Classic Neo-Brutalist Diff */}
          <div className="lg:col-span-7 bg-white border-2 border-black rounded-[24px] sm:rounded-[32px] p-6 sm:p-9 shadow-[6px_6px_0px_#111] space-y-6 flex flex-col justify-between min-h-[500px]">
            {/* Header with Title and Version */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-neutral-100 pb-3">
                <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-black">
                  Local Commit Engine
                </span>
                <span className="text-[11px] sm:text-xs font-mono font-bold text-neutral-400">
                  v. 2.4.0 • Sandbox Active
                </span>
              </div>

              <div className="space-y-2 pt-1">
                <h3 className="text-2xl sm:text-3xl font-bold text-black tracking-tight">
                  Checks code locally on every single commit
                </h3>
                <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed max-w-xl">
                  Every commit triggers disposable Docker containers on your machine. Zerra seeds throwaway databases with synthetic data, runs Semgrep SAST, scans dependencies, and verifies fixes with <code className="bg-neutral-100 px-1.5 py-0.5 rounded font-mono text-xs text-black border border-neutral-200">git apply --check</code> before anything touches production.
                </p>
              </div>
            </div>

            {/* Visual Isometric Stack / Sandbox Simulator (Original Reverted Clean Neo-Brutalist Style) */}
            <div className="relative my-4 p-5 bg-[#F8F8FA] border-2 border-black rounded-2xl shadow-[4px_4px_0px_#111] overflow-hidden space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-neutral-500 border-b border-neutral-200 pb-2">
                <span className="flex items-center gap-1.5 text-black font-bold">
                  <GitCommit size={14} className="text-[#FF6B53] shrink-0" />
                  <span className="truncate">commit 8f2b41c (feat: checkout endpoint)</span>
                </span>
                <span className="text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full font-semibold border border-emerald-300 text-[11px] shrink-0">
                  ● Sandbox: All Tests Passed
                </span>
              </div>

              {/* Layer 1: SAST Finding */}
              <div className="p-3 bg-white border border-neutral-300 rounded-xl space-y-1.5 text-xs font-mono">
                <div className="flex flex-wrap items-center justify-between gap-1">
                  <span className="text-red-600 font-bold">SAST • SQL Injection (CWE-89)</span>
                  <span className="text-neutral-400 text-[11px]">internal/db/users.go:42</span>
                </div>
                <div className="text-neutral-700 bg-red-50/60 p-2 rounded border border-red-200 text-[11px] overflow-x-auto whitespace-pre font-mono">
                  <span className="text-red-500 line-through">- query := &quot;SELECT * FROM users WHERE id = &apos;&quot; + id + &quot;&apos;&quot;</span>
                  {"\n"}
                  <span className="text-emerald-600 font-bold">+ row := db.QueryRow(&quot;SELECT * FROM users WHERE id = $1&quot;, id)</span>
                </div>
              </div>

              {/* Layer 2: Verification Status */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-1">
                <span className="flex items-center gap-1.5 text-neutral-600">
                  <ShieldCheck size={14} className="text-emerald-600 shrink-0" />
                  <span>Isolated network bridge (zero internet outbound)</span>
                </span>
                <span className="font-mono text-[11px] text-neutral-400">0 regressions</span>
              </div>
            </div>

            {/* Read full documentation footer link */}
            <div className="pt-2">
              <a
                href="https://github.com/sjsreehari/zerra/blob/main/docs/ARCHITECTURE.md"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-xs font-bold text-black group hover:text-[#FF6B53] transition-colors"
              >
                <span className="w-7 h-7 rounded-full border-2 border-black flex items-center justify-center group-hover:bg-[#FF6B53] group-hover:text-white transition-all">
                  <ArrowUpRight size={14} />
                </span>
                <span>Read complete system architecture</span>
              </a>
            </div>
          </div>

          {/* Right Column: Stacked Interactive Cards */}
          <div className="lg:col-span-5 space-y-5">
            {/* Card 1: Coral Accent Card (Expanded on load by default, and can shrink) */}
            <div
              className="bg-[#FF6B53] text-white border-2 border-black rounded-[24px] sm:rounded-[32px] p-6 sm:p-7 shadow-[6px_6px_0px_#111] transition-all cursor-pointer"
              onClick={() => setOpenCard(openCard === "auto-pr" ? null : "auto-pr")}
            >
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                  Auto-PR on Push to Prod
                </h3>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenCard(openCard === "auto-pr" ? null : "auto-pr");
                  }}
                  aria-label="Toggle Auto-PR details"
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border-2 border-black bg-white text-black flex items-center justify-center shadow-[2px_2px_0px_#111] hover:scale-105 transition-transform shrink-0"
                >
                  {openCard === "auto-pr" ? <Minus size={18} /> : <Plus size={18} />}
                </button>
              </div>

              {openCard === "auto-pr" && (
                <div className="pt-4 space-y-4 text-white/95 text-xs sm:text-sm leading-relaxed">
                  <p>
                    When code is pushed toward main or production branches, Zerra autonomously verifies all proposed fixes inside isolated Docker sandboxes and creates a formatted GitHub Pull Request for human review.
                  </p>

                  <div className="p-3 bg-black/25 border border-black/20 rounded-xl space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-1 text-xs font-mono">
                      <span>Branch: <code className="text-yellow-200">zerra/fix-cwe-89</code></span>
                      <span className="font-bold text-white bg-black/40 px-2 py-0.5 rounded text-[11px]">Target: main</span>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setPrCreated(!prCreated);
                      }}
                      className="w-full py-2 bg-white text-black font-bold text-xs rounded-lg border-2 border-black shadow-[2px_2px_0px_#111] hover:bg-neutral-100 transition-all flex items-center justify-center gap-1.5"
                    >
                      <GitPullRequest size={14} />
                      <span>{prCreated ? "✓ Pull Request Opened on GitHub!" : "Simulate Auto-PR Dispatch"}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Card 2: 1-Click Manual Fix Button */}
            <div
              className="bg-white border-2 border-black rounded-[24px] sm:rounded-[32px] p-6 shadow-[6px_6px_0px_#111] transition-all cursor-pointer"
              onClick={() => setOpenCard(openCard === "manual-fix" ? null : "manual-fix")}
            >
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg sm:text-xl font-bold tracking-tight text-black">
                  1-Click Manual Fix Button
                </h3>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenCard(openCard === "manual-fix" ? null : "manual-fix");
                  }}
                  aria-label="Toggle Manual Fix details"
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border-2 border-black bg-white text-black flex items-center justify-center shadow-[2px_2px_0px_#111] hover:scale-105 transition-transform shrink-0"
                >
                  {openCard === "manual-fix" ? <Minus size={18} /> : <Plus size={18} />}
                </button>
              </div>

              {openCard === "manual-fix" && (
                <div className="pt-4 space-y-3 text-neutral-600 text-xs leading-relaxed border-t border-neutral-100 mt-3">
                  <p>
                    Prefer manual control? Browse findings in your local dashboard and click the <strong className="text-black">Apply Fix</strong> button. Zerra writes the unified patch directly to your working tree and commits it to a clean branch.
                  </p>

                  <div className="p-3 bg-[#F8F8FA] border-2 border-black rounded-xl space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-1 font-mono text-[11px]">
                      <span className="text-red-600 font-bold">Stripe Key Exposed (CWE-798)</span>
                      <span className="text-neutral-400">config/payments.py</span>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setFixedState(!fixedState);
                      }}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg border-2 border-black shadow-[2px_2px_0px_#111] transition-all flex items-center justify-center gap-1.5"
                    >
                      <Zap size={14} className="text-amber-300" />
                      <span>{fixedState ? "✓ Patch Applied & Committed Locally" : "Click 'Apply Fix' Button"}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Card 3: WhatsApp, Discord & Slack Integration */}
            <div
              className="bg-white border-2 border-black rounded-[24px] sm:rounded-[32px] p-6 shadow-[6px_6px_0px_#111] transition-all cursor-pointer"
              onClick={() => setOpenCard(openCard === "integrations" ? null : "integrations")}
            >
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg sm:text-xl font-bold tracking-tight text-black">
                  WhatsApp, Discord & Slack Alerts
                </h3>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenCard(openCard === "integrations" ? null : "integrations");
                  }}
                  aria-label="Toggle Integrations details"
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border-2 border-black bg-white text-black flex items-center justify-center shadow-[2px_2px_0px_#111] hover:scale-105 transition-transform shrink-0"
                >
                  {openCard === "integrations" ? <Minus size={18} /> : <Plus size={18} />}
                </button>
              </div>

              {openCard === "integrations" && (
                <div className="pt-4 space-y-3 text-neutral-600 text-xs leading-relaxed border-t border-neutral-100 mt-3">
                  <p>
                    Instant multi-channel push notifications when critical vulnerabilities are found, with direct 1-click PR review links.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 font-mono text-[11px] text-center">
                    <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold">
                      WhatsApp Cloud
                    </div>
                    <div className="p-2.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-800 font-bold">
                      Discord Webhook
                    </div>
                    <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 font-bold">
                      Slack Webhook
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom 3-Column Highlights Strip */}
        <div id="how-it-works" className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          {/* Box 1 */}
          <div className="bg-white border-2 border-black rounded-[24px] sm:rounded-[28px] p-6 shadow-[5px_5px_0px_#111] space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-black text-white flex items-center justify-center font-bold text-base shadow-[2px_2px_0px_#FF6B53]">
              <Lock size={18} />
            </div>
            <h4 className="text-lg font-bold text-black">100% Local-First</h4>
            <p className="text-xs text-neutral-600 leading-relaxed">
              Your source code, databases, and credentials never touch external SaaS clouds. Everything executes inside your local Docker daemon.
            </p>
          </div>

          {/* Box 2 */}
          <div className="bg-white border-2 border-black rounded-[24px] sm:rounded-[28px] p-6 shadow-[5px_5px_0px_#111] space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-black text-white flex items-center justify-center font-bold text-base shadow-[2px_2px_0px_#FF6B53]">
              <ShieldCheck size={18} />
            </div>
            <h4 className="text-lg font-bold text-black">Blue-Team Defense Only</h4>
            <p className="text-xs text-neutral-600 leading-relaxed">
              Strictly find, fix, and prove. No dangerous exploitation scripts or offensive tooling. Verified fixes pass real tests and linters.
            </p>
          </div>

          {/* Box 3 */}
          <div className="bg-white border-2 border-black rounded-[24px] sm:rounded-[28px] p-6 shadow-[5px_5px_0px_#111] space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-black text-white flex items-center justify-center font-bold text-base shadow-[2px_2px_0px_#FF6B53]">
              <GitBranch size={18} />
            </div>
            <h4 className="text-lg font-bold text-black">Human in the Loop</h4>
            <p className="text-xs text-neutral-600 leading-relaxed">
              Every automated patch arrives as an authored Pull Request or GitHub Issue. Zerra never pushes directly to your default branch.
            </p>
          </div>
        </div>

        {/* Bottom CTA Banner */}
        <div className="bg-black text-white border-2 border-black rounded-[28px] sm:rounded-[36px] p-7 sm:p-12 shadow-[8px_8px_0px_#FF6B53] flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center md:text-left">
            {nextSpot && (
              <div className="inline-block px-3 py-1 bg-[#FF6B53] text-white font-mono text-[11px] font-bold rounded-full mb-1">
                CURRENT SPOT #{nextSpot}
              </div>
            )}
            <h3 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
              Ready to secure your local repositories?
            </h3>
            <p className="text-xs sm:text-sm text-neutral-300 max-w-xl">
              Get early access to autonomous local-first blue-team security and automated verified pull requests.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0 w-full md:w-auto">
            <button
              onClick={() => {
                setWaitlistResult(null);
                setWaitlistError(null);
                setShowWaitlist(true);
              }}
              className="w-full md:w-auto px-7 py-3.5 bg-[#FF6B53] text-white font-bold text-sm rounded-xl border-2 border-white shadow-[3px_3px_0px_#FFFFFF] hover:shadow-[1px_1px_0px_#FFFFFF] hover:translate-x-[2px] hover:translate-y-[2px] transition-all flex items-center justify-center gap-2"
            >
              <span>Join the Waitlist</span>
              <ArrowRight size={15} />
            </button>
          </div>
        </div>

        {/* Minimal Footer */}
        <footer className="pt-8 border-t border-neutral-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-500 font-mono text-center sm:text-left">
          <div>
            © 2026 Zerra Security Platform. Open source under GPL-3.0.
          </div>
          <div className="flex items-center gap-6">
            <a href="https://github.com/sjsreehari/zerra" target="_blank" rel="noreferrer" className="hover:text-black transition-colors">
              GitHub
            </a>
            <a
              href="https://github.com/sjsreehari/zerra/blob/main/docs/ARCHITECTURE.md"
              target="_blank"
              rel="noreferrer"
              className="hover:text-black transition-colors"
            >
              Architecture Spec
            </a>
          </div>
        </footer>
      </main>

      {/* Join Waitlist Modal */}
      {showWaitlist && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150 overflow-y-auto"
          onClick={() => setShowWaitlist(false)}
        >
          <div
            className="w-full max-w-md bg-white border-2 border-black rounded-[28px] sm:rounded-[32px] p-6 sm:p-8 shadow-[8px_8px_0px_#111] space-y-5 my-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#FF6B53]" />
                <span className="text-xs font-mono font-bold uppercase text-neutral-500">
                  Priority Early Access
                </span>
              </div>
              <button
                onClick={() => setShowWaitlist(false)}
                className="w-8 h-8 rounded-full border-2 border-black text-black hover:bg-neutral-100 flex items-center justify-center font-bold text-xs"
              >
                ✕
              </button>
            </div>

            <div className="space-y-1.5">
              <h3 className="text-2xl font-black text-black tracking-tight">
                Join the Zerra Waitlist
              </h3>
              <p className="text-xs text-neutral-600 leading-relaxed">
                Be the first to experience local-first blue-team defense, automated Docker sandbox patch verification, and multi-channel incident alerting.
              </p>
            </div>

            {waitlistResult ? (
              <div className="p-5 bg-amber-50 border-2 border-black rounded-2xl text-center space-y-3 shadow-[3px_3px_0px_#111]">
                {/* Big Waitlist Number Badge */}
                <div className="inline-block px-4 py-2 bg-black text-white font-mono font-black text-xl rounded-xl shadow-[3px_3px_0px_#FF6B53]">
                  SPOT #{waitlistResult.position}
                </div>

                <div className="space-y-1">
                  <div className="text-sm font-black text-black">
                    {waitlistResult.alreadyRegistered
                      ? "You are already on the list!"
                      : "Welcome aboard! Spot secured."}
                  </div>
                  <p className="text-xs text-neutral-700 leading-relaxed font-mono">
                    You are <strong className="text-black">#{waitlistResult.position}</strong> in the queue.
                  </p>
                  <p className="text-[11px] text-neutral-500 pt-1">
                    Invite will be dispatched to <span className="font-bold font-mono text-black">{email}</span>.
                  </p>
                </div>

                <button
                  onClick={() => setShowWaitlist(false)}
                  className="w-full py-2.5 bg-black hover:bg-neutral-800 text-white font-bold text-xs rounded-xl transition-all"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleWaitlistSubmit} className="space-y-3.5">
                <div className="space-y-1.5">
                  <label className="text-xs font-mono font-bold text-neutral-700 flex items-center justify-between">
                    <span>Work Email</span>
                    {nextSpot && <span className="text-[#FF6B53] text-[11px]">Next spot: #{nextSpot}</span>}
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="w-full px-4 py-3 bg-[#F8F8FA] border-2 border-black rounded-xl text-xs text-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#FF6B53] font-mono"
                  />
                </div>

                {waitlistError && (
                  <div className="p-2.5 bg-red-50 border border-red-300 rounded-xl text-xs text-red-700 font-mono">
                    {waitlistError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 bg-black hover:bg-neutral-800 disabled:opacity-75 text-white font-bold text-xs rounded-xl shadow-[3px_3px_0px_#FF6B53] hover:shadow-[1px_1px_0px_#FF6B53] hover:translate-x-[2px] hover:translate-y-[2px] transition-all flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={14} className="animate-spin text-amber-300" />
                      <span>Reserving Spot...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} className="text-amber-300" />
                      <span>Get My Waitlist Number</span>
                    </>
                  )}
                </button>

                <p className="text-[11px] text-center text-neutral-400 font-mono">
                  🔒 Zero spam. 100% encrypted & private.
                </p>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
