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

        {/* Notifications Popover */}
        <NotificationPopover />

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

function NotificationPopover() {
  const [isOpen, setIsOpen] = useState(false);

  const notifications = [
    {
      id: 1,
      title: "Zero-Trust Enforcement Active",
      desc: "All incoming requests evaluated through triple-engine risk graph.",
      time: "Just now",
      type: "success",
    },
    {
      id: 2,
      title: "Real-time Attack Hunter Ready",
      desc: "Llama 3.2 threat model loaded and standing by for incident triage.",
      time: "3m ago",
      type: "info",
    },
    {
      id: 3,
      title: "Automated Sandbox Active",
      desc: "Docker container sandboxes provisioned with strict resource limits.",
      time: "12m ago",
      type: "warning",
    },
  ];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors"
        title="Security Notifications"
      >
        <Bell size={16} />
        <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-500 ring-2 ring-bg-surface" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-80 rounded-xl bg-bg-surface border border-border-default shadow-xl z-50 p-3 animate-in fade-in zoom-in-95 duration-100">
            <div className="flex items-center justify-between pb-2 border-b border-border-default mb-2">
              <div className="flex items-center gap-2">
                <Bell size={13} className="text-blue-400" />
                <span className="text-xs font-semibold text-text-primary">System Notifications</span>
              </div>
              <span className="text-[10px] text-text-muted">3 unread</span>
            </div>

            <div className="space-y-2">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className="p-2 rounded-lg bg-bg-surface-sunken/60 hover:bg-bg-surface-sunken border border-border-default/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-text-primary">{n.title}</span>
                    <span className="text-[10px] text-text-muted">{n.time}</span>
                  </div>
                  <p className="text-[11px] text-text-secondary mt-0.5 leading-relaxed">{n.desc}</p>
                </div>
              ))}
            </div>

            <div className="mt-3 pt-2 border-t border-border-default text-center">
              <Link
                href="/dashboard/threats"
                onClick={() => setIsOpen(false)}
                className="text-[11px] text-blue-400 hover:text-blue-300 font-medium"
              >
                View full threat incident log →
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}