"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Shield,
  Zap,
  Search,
  Activity,
  Bell,
  CheckCircle2,
  Lock,
  Radio,
  ExternalLink,
} from "lucide-react";

export default function Topbar() {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <header className="w-full h-16 border-b border-border-default bg-bg-surface/80 backdrop-blur-md px-6 flex items-center justify-between shrink-0 z-10">
      {/* Left: Environment, Cluster Health, and Breadcrumb */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="flex h-2.5 w-2.5 items-center justify-center">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          </div>
          <span className="text-xs font-semibold tracking-wide text-text-primary uppercase">
            US-East-1 Production
          </span>
          <span className="text-border-stronger">/</span>
          <span className="text-xs text-text-secondary">Gateway v2.4</span>
        </div>

        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
          <Shield size={12} />
          <span>Zero-Trust Policy Enforced</span>
        </div>
      </div>

      {/* Middle: Universal Search Bar */}
      <div className="flex-1 max-w-md mx-6 hidden md:block">
        <div className="relative">
          <Search
            size={14}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search CVEs, endpoints, virtual patches, identities..."
            className="w-full bg-bg-surface-sunken border border-border-default rounded-lg pl-9 pr-8 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-focus focus:ring-1 focus:ring-border-focus transition-all"
          />
          <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] bg-bg-surface border border-border-default rounded px-1.5 py-0.5 text-text-muted font-mono">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Right: Real-time Stats & Quick Actions */}
      <div className="flex items-center gap-3">
        {/* Gateway Telemetry Pill */}
        <div className="hidden xl:flex items-center gap-2 px-3 py-1 rounded-lg bg-bg-surface-sunken border border-border-default text-xs text-text-secondary">
          <Radio size={12} className="text-blue-400 animate-pulse" />
          <span>Live Ingestion:</span>
          <span className="font-semibold text-text-primary">100% Validated</span>
        </div>

        {/* Quick Launch Pentest Button */}
        <Link
          href="/dashboard/security"
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-sm transition-all active:scale-[0.98]"
        >
          <Zap size={13} className="text-amber-300" />
          <span>Launch AI Pentest</span>
        </Link>
      </div>
    </header>
  );
}