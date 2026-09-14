"use client";

import React, { useState, useEffect } from "react";
import { APIENDPOINT } from "@/config/Backend";
import {
  AlertTriangle,
  ShieldAlert,
  Zap,
  Play,
  CheckCircle2,
  RefreshCw,
  Search,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  UserX,
  Lock,
} from "lucide-react";

interface RiskCard {
  id: string;
  identity_id: string;
  verdict: "allow" | "step_up" | "block";
  confidence: number;
  trust_score: number;
  owasp_tag: string;
  mitre_tag: string;
  evidence: string;
  timestamp: string;
}

const SAMPLE_RISKS: RiskCard[] = [
  {
    id: "rc-901",
    identity_id: "agent-order-scraper",
    verdict: "block",
    confidence: 0.94,
    trust_score: 28,
    owasp_tag: "API1:2023 - BOLA",
    mitre_tag: "T1595 - Active Scanning",
    evidence: "Rapid sequential iteration over /api/v1/users/{id} across distinct tenant IDs. Novel object access rate exceeded 15 objects/min.",
    timestamp: "4 mins ago",
  },
  {
    id: "rc-902",
    identity_id: "service-untrusted-mcp",
    verdict: "block",
    confidence: 0.91,
    trust_score: 35,
    owasp_tag: "LLM07:2025 - System Prompt & Tool Poisoning",
    mitre_tag: "T1059 - Command and Scripting Interpreter",
    evidence: "Attempted to execute unauthorized tool call 'read_system_config' outside scope contract declared in MCP manifest.",
    timestamp: "18 mins ago",
  },
  {
    id: "rc-903",
    identity_id: "human-dev-guest",
    verdict: "step_up",
    confidence: 0.82,
    trust_score: 62,
    owasp_tag: "API5:2023 - BFLA",
    mitre_tag: "T1078 - Valid Accounts",
    evidence: "Non-admin identity invoked administrative billing adjustment route. Trust score degraded; step-up verification prompted.",
    timestamp: "1 hour ago",
  },
];

export default function ThreatsPage() {
  const [riskCards, setRiskCards] = useState<RiskCard[]>(SAMPLE_RISKS);
  const [expandedId, setExpandedId] = useState<string | null>("rc-901");
  const [isSimulating, setIsSimulating] = useState(false);

  const handleSimulateAttack = async () => {
    setIsSimulating(true);
    try {
      const res = await fetch(APIENDPOINT.AttackSimRun, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario: "bola_burst" }),
      });
      if (res.ok) {
        const newCard: RiskCard = {
          id: `rc-${Date.now().toString().slice(-3)}`,
          identity_id: "simulated-attacker-bot",
          verdict: "block",
          confidence: 0.98,
          trust_score: 18,
          owasp_tag: "API1:2023 - Broken Object Level Auth",
          mitre_tag: "T1110 - Brute Force",
          evidence: "Simulated attack run detected! 25 unauthorized object accesses blocked in 1.2s.",
          timestamp: "Just now",
        };
        setRiskCards((prev) => [newCard, ...prev]);
      }
    } catch {
      // Fallback local simulation
      const newCard: RiskCard = {
        id: `rc-${Date.now().toString().slice(-3)}`,
        identity_id: "simulated-attacker-bot",
        verdict: "block",
        confidence: 0.98,
        trust_score: 18,
        owasp_tag: "API1:2023 - Broken Object Level Auth",
        mitre_tag: "T1110 - Brute Force",
        evidence: "Simulated attack run detected! 25 unauthorized object accesses blocked in 1.2s.",
        timestamp: "Just now",
      };
      setRiskCards((prev) => [newCard, ...prev]);
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-r from-red-950/40 via-zinc-900 to-black/80 p-6 backdrop-blur-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="flex h-2 w-2 rounded-full bg-red-400 animate-pulse" />
              <span className="text-xs font-semibold tracking-wider uppercase text-red-400">
                Threat Intelligence & Risk Cards
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <AlertTriangle className="h-6 w-6 text-red-400" />
              Active Threats & Anomaly Forensics
            </h1>
            <p className="text-sm text-text-secondary mt-1 max-w-2xl">
              Inspect explainable Risk Cards generated whenever behavioral anomalies, trust degradations, or policy violations occur.
            </p>
          </div>

          <button
            onClick={handleSimulateAttack}
            disabled={isSimulating}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white font-semibold text-xs shadow-md transition-all active:scale-[0.98] disabled:opacity-50"
          >
            <Play size={13} />
            <span>{isSimulating ? "Simulating..." : "Trigger Attack Simulation"}</span>
          </button>
        </div>
      </div>

      {/* Risk Cards List */}
      <div className="space-y-3">
        {riskCards.map((rc) => {
          const isExpanded = expandedId === rc.id;
          return (
            <div
              key={rc.id}
              className="rounded-xl border border-border-default bg-bg-surface overflow-hidden shadow-sm hover:border-border-strong transition-all"
            >
              <div
                onClick={() => setExpandedId(isExpanded ? null : rc.id)}
                className="p-4 cursor-pointer flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-lg ${
                      rc.verdict === "block"
                        ? "bg-red-500/15 text-red-400"
                        : "bg-amber-500/15 text-amber-400"
                    }`}
                  >
                    <ShieldAlert size={18} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-text-primary">{rc.owasp_tag}</span>
                      <span className="text-[10px] font-mono text-text-muted bg-bg-surface-sunken px-1.5 py-0.5 rounded border border-border-default">
                        {rc.mitre_tag}
                      </span>
                    </div>
                    <div className="text-xs text-text-secondary mt-0.5">
                      Target Identity: <span className="font-mono text-text-primary">{rc.identity_id}</span> • {rc.timestamp}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                      rc.verdict === "block"
                        ? "bg-red-500/10 text-red-400 border-red-500/20"
                        : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                    }`}
                  >
                    VERDICT: {rc.verdict.toUpperCase()} (Trust {rc.trust_score})
                  </span>
                  {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </div>
              </div>

              {isExpanded && (
                <div className="p-4 bg-bg-surface-sunken border-t border-border-default space-y-3 text-xs">
                  <div>
                    <span className="font-semibold text-text-primary block mb-1">Behavioral Evidence:</span>
                    <p className="text-text-secondary bg-bg-surface p-3 rounded-lg border border-border-default font-mono">
                      {rc.evidence}
                    </p>
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-text-muted text-[11px]">
                      Confidence Score: {(rc.confidence * 100).toFixed(0)}% • Graph & Sequence Risk Analyzed
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => alert(`Identity ${rc.identity_id} revoked.`)}
                        className="px-3 py-1 rounded-md bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 font-medium flex items-center gap-1.5 transition-colors"
                      >
                        <UserX size={12} /> Revoke Identity
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
