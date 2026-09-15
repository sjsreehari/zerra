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
      {/* Left: Environment and Status */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-bold text-text-primary tracking-tight">
          Security Command Center
        </span>
        <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-medium text-emerald-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Active
        </span>
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
            placeholder="Search repositories, findings, rules..."
            className="w-full bg-bg-surface-sunken border border-border-default rounded-lg pl-9 pr-8 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-focus transition-all"
          />
          <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] bg-bg-surface border border-border-default rounded px-1.5 py-0.5 text-text-muted font-mono">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Right: Quick Actions */}
      <div className="flex items-center gap-3">
        <NotificationPopover />

        <Link
          href="/dashboard/repositories"
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm transition-all active:scale-[0.98]"
        >
          <Zap size={13} className="text-amber-300" />
          <span>New Scan</span>
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