"use client";

import React, { useState } from "react";
import {
  Settings,
  ShieldCheck,
  Server,
  Zap,
  Check,
  Sliders,
  Lock,
} from "lucide-react";

export default function SettingsPage() {
  const [zerraUrl, setZerraUrl] = useState("http://localhost:8000");
  const [gatewayUrl, setGatewayUrl] = useState("http://localhost:8080");
  const [requestBudget, setRequestBudget] = useState(60);
  const [rateLimit, setRateLimit] = useState(10);
  const [stepUpThreshold, setStepUpThreshold] = useState(70);
  const [blockThreshold, setBlockThreshold] = useState(40);
  const [autoVirtualPatch, setAutoVirtualPatch] = useState(true);
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-r from-zinc-900 via-zinc-800 to-black/80 p-6 backdrop-blur-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="flex h-2 w-2 rounded-full bg-blue-400" />
              <span className="text-xs font-semibold tracking-wider uppercase text-blue-400">
                System Administration
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Settings className="h-6 w-6 text-text-primary" />
              Gateway & Engine Settings
            </h1>
            <p className="text-sm text-text-secondary mt-1 max-w-2xl">
              Configure Go Gateway proxy connectivity, zero-trust evaluation thresholds, and autonomous pentest probing parameters.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6 max-w-4xl">
        {/* Gateway Architecture Settings */}
        <div className="rounded-2xl border border-border-default bg-bg-surface p-6 space-y-4 shadow-sm">
          <h2 className="text-base font-semibold text-text-primary flex items-center gap-2">
            <Server size={16} className="text-blue-500" />
            Gateway & Upstream Services
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-text-secondary font-medium mb-1">
                Zero-Trust Engine URL (Zerra API)
              </label>
              <input
                type="text"
                value={zerraUrl}
                onChange={(e) => setZerraUrl(e.target.value)}
                className="w-full bg-bg-surface-sunken border border-border-default rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:border-border-focus font-mono"
              />
            </div>
            <div>
              <label className="block text-text-secondary font-medium mb-1">
                Reverse Proxy Gateway URL (Go Proxy)
              </label>
              <input
                type="text"
                value={gatewayUrl}
                onChange={(e) => setGatewayUrl(e.target.value)}
                className="w-full bg-bg-surface-sunken border border-border-default rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:border-border-focus font-mono"
              />
            </div>
          </div>
        </div>

        {/* Autonomous Pentesting Parameters */}
        <div className="rounded-2xl border border-border-default bg-bg-surface p-6 space-y-4 shadow-sm">
          <h2 className="text-base font-semibold text-text-primary flex items-center gap-2">
            <Zap size={16} className="text-amber-500" />
            Autonomous Pentest Controls
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-text-secondary font-medium mb-1">
                Default Request Budget per Scan
              </label>
              <input
                type="number"
                value={requestBudget}
                onChange={(e) => setRequestBudget(Number(e.target.value))}
                className="w-full bg-bg-surface-sunken border border-border-default rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:border-border-focus"
              />
              <span className="text-[11px] text-text-muted mt-1 block">
                Upper bound on HTTP requests sent during an autonomous exploration session.
              </span>
            </div>

            <div>
              <label className="block text-text-secondary font-medium mb-1">
                Rate Limit (req/sec)
              </label>
              <input
                type="number"
                value={rateLimit}
                onChange={(e) => setRateLimit(Number(e.target.value))}
                className="w-full bg-bg-surface-sunken border border-border-default rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:border-border-focus"
              />
              <span className="text-[11px] text-text-muted mt-1 block">
                Prevents accidental denial of service against production targets.
              </span>
            </div>
          </div>
        </div>

        {/* Zero-Trust Decision Thresholds */}
        <div className="rounded-2xl border border-border-default bg-bg-surface p-6 space-y-4 shadow-sm">
          <h2 className="text-base font-semibold text-text-primary flex items-center gap-2">
            <Lock size={16} className="text-purple-500" />
            Zero-Trust Adaptive Thresholds
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-text-secondary font-medium mb-1">
                Step-Up Verification Threshold (Below)
              </label>
              <input
                type="number"
                value={stepUpThreshold}
                onChange={(e) => setStepUpThreshold(Number(e.target.value))}
                className="w-full bg-bg-surface-sunken border border-border-default rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:border-border-focus"
              />
              <span className="text-[11px] text-text-muted mt-1 block">
                Requests from identities below this trust score require MFA or re-auth (Yellow Zone).
              </span>
            </div>

            <div>
              <label className="block text-text-secondary font-medium mb-1">
                Hard Block Threshold (Below)
              </label>
              <input
                type="number"
                value={blockThreshold}
                onChange={(e) => setBlockThreshold(Number(e.target.value))}
                className="w-full bg-bg-surface-sunken border border-border-default rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:border-border-focus"
              />
              <span className="text-[11px] text-text-muted mt-1 block">
                Requests below this trust score are instantly rejected with 403 Forbidden (Red Zone).
              </span>
            </div>
          </div>

          <div className="pt-3 border-t border-border-default flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-text-primary block">
                Auto-Synthesize Inline Virtual Patches
              </span>
              <span className="text-[11px] text-text-secondary">
                Automatically convert confirmed pentest vulnerabilities into proposed Gateway rules.
              </span>
            </div>
            <input
              type="checkbox"
              checked={autoVirtualPatch}
              onChange={(e) => setAutoVirtualPatch(e.target.checked)}
              className="h-4 w-4 rounded accent-blue-600 cursor-pointer"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          {saved && (
            <span className="text-xs text-emerald-400 flex items-center gap-1">
              <Check size={14} /> Settings Saved
            </span>
          )}
          <button
            type="submit"
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-all shadow-sm active:scale-[0.98]"
          >
            Save Configuration
          </button>
        </div>
      </form>
    </div>
  );
}
