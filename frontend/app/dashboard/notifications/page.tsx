"use client";

import React, { useState, useEffect } from "react";
import { APIENDPOINT } from "@/config/Backend";
import {
  Bell,
  MessageCircle,
  Mail,
  Phone,
  Users,
  CheckCircle2,
  XCircle,
  Loader2,
  Send,
  Zap,
  Settings,
} from "lucide-react";

interface ChannelConfig {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  description: string;
  envVar: string;
  placeholder: string;
}

const CHANNELS: ChannelConfig[] = [
  {
    id: "discord",
    name: "Discord",
    icon: <MessageCircle size={20} />,
    color: "text-indigo-400",
    bgColor: "bg-indigo-500/10 border-indigo-500/20",
    description: "Rich embeds with severity colors, finding details, and action links",
    envVar: "ZERRA_DISCORD_WEBHOOK_URL",
    placeholder: "https://discord.com/api/webhooks/...",
  },
  {
    id: "email",
    name: "Email",
    icon: <Mail size={20} />,
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/10 border-cyan-500/20",
    description: "HTML-formatted security digest emails with dark-themed reports",
    envVar: "ZERRA_SMTP_HOST, ZERRA_EMAIL_TO",
    placeholder: "smtp.gmail.com",
  },
  {
    id: "whatsapp",
    name: "WhatsApp",
    icon: <Phone size={20} />,
    color: "text-green-400",
    bgColor: "bg-green-500/10 border-green-500/20",
    description: "Critical alerts sent directly to your phone via WhatsApp Business API",
    envVar: "ZERRA_WHATSAPP_API_URL, ZERRA_WHATSAPP_API_TOKEN",
    placeholder: "Only CRITICAL severity by default",
  },
  {
    id: "teams",
    name: "Microsoft Teams",
    icon: <Users size={20} />,
    color: "text-violet-400",
    bgColor: "bg-violet-500/10 border-violet-500/20",
    description: "Adaptive Cards with severity badges, findings tables, and action buttons",
    envVar: "ZERRA_TEAMS_WEBHOOK_URL",
    placeholder: "https://outlook.office.com/webhook/...",
  },
];

export default function NotificationsPage() {
  const [activeChannels, setActiveChannels] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [testResults, setTestResults] = useState<Record<string, boolean | null>>({});
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    fetchChannels();
  }, []);

  const fetchChannels = async () => {
    try {
      const res = await fetch(APIENDPOINT.NotificationsChannels);
      if (res.ok) {
        const data = await res.json();
        setActiveChannels(data.channels || []);
      }
    } catch {}
    setLoading(false);
  };

  const testAllChannels = async () => {
    setTesting(true);
    setTestResults({});
    try {
      const res = await fetch(APIENDPOINT.NotificationsTest, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setTestResults(data.results || {});
      }
    } catch {}
    setTesting(false);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Notifications</h1>
          <p className="text-sm text-text-muted mt-1">
            Configure alert channels. Get notified when vulnerabilities are found.
          </p>
        </div>
        <button
          onClick={testAllChannels}
          disabled={testing || activeChannels.length === 0}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-medium rounded-lg hover:from-blue-500 hover:to-indigo-500 transition-all shadow-lg shadow-blue-500/25 disabled:opacity-50"
        >
          {testing ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          Test All Channels
        </button>
      </div>

      {/* Active channels badge */}
      <div className="flex items-center gap-2 text-sm">
        <Zap size={14} className="text-yellow-400" />
        <span className="text-text-muted">
          {activeChannels.length > 0 ? (
            <>
              <span className="text-emerald-400 font-medium">{activeChannels.length}</span> channel{activeChannels.length !== 1 ? "s" : ""} active:{" "}
              {activeChannels.map((ch) => (
                <span key={ch} className="inline-flex items-center px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-xs rounded-md border border-emerald-500/20 ml-1">
                  {ch}
                </span>
              ))}
            </>
          ) : (
            "No channels configured. Set environment variables to enable notifications."
          )}
        </span>
      </div>

      {/* Channel Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {CHANNELS.map((channel) => {
          const isActive = activeChannels.includes(channel.id);
          const testResult = testResults[channel.id];

          return (
            <div
              key={channel.id}
              className={`border rounded-xl p-5 transition-all ${
                isActive
                  ? `${channel.bgColor} border-opacity-50`
                  : "bg-bg-card border-border-default opacity-60"
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${isActive ? channel.bgColor : "bg-slate-500/10"}`}>
                    <span className={isActive ? channel.color : "text-text-muted"}>{channel.icon}</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-text-primary text-sm">{channel.name}</h3>
                    <p className="text-[11px] text-text-muted mt-0.5">{channel.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {testResult === true && <CheckCircle2 size={16} className="text-emerald-400" />}
                  {testResult === false && <XCircle size={16} className="text-red-400" />}
                  {isActive ? (
                    <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[10px] font-medium rounded border border-emerald-500/20">ACTIVE</span>
                  ) : (
                    <span className="px-2 py-0.5 bg-slate-500/10 text-slate-400 text-[10px] font-medium rounded border border-slate-500/20">INACTIVE</span>
                  )}
                </div>
              </div>

              <div className="mt-4 p-3 bg-bg-page/50 rounded-lg border border-border-default">
                <p className="text-[10px] text-text-muted font-medium mb-1">Environment Variables</p>
                <code className="text-xs text-blue-400 break-all">{channel.envVar}</code>
              </div>
            </div>
          );
        })}
      </div>

      {/* Severity Routing */}
      <div className="bg-bg-card border border-border-default rounded-xl p-5">
        <h3 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
          <Settings size={14} className="text-text-muted" />
          Severity Routing
        </h3>
        <p className="text-xs text-text-muted mb-4">
          Control which severity levels trigger notifications on each channel.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {[
            { channel: "Discord", default: "All severities (Low+)", color: "text-indigo-400" },
            { channel: "Email", default: "Medium and above", color: "text-cyan-400" },
            { channel: "WhatsApp", default: "Critical only", color: "text-green-400" },
            { channel: "Teams", default: "Medium and above", color: "text-violet-400" },
          ].map((item) => (
            <div key={item.channel} className="bg-bg-page rounded-lg border border-border-default p-3">
              <p className={`text-xs font-medium ${item.color}`}>{item.channel}</p>
              <p className="text-[10px] text-text-muted mt-1">{item.default}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
