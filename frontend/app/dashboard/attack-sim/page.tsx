"use client";

import { useEffect, useState } from "react";
import { APIENDPOINT } from "@/config/Backend";
import { Zap, Play, Loader2, Shield, AlertTriangle, CheckCircle } from "lucide-react";

interface Scenario {
  id: string;
  name: string;
  description: string;
  type: string;
}

interface SimResult {
  scenario_id: string;
  total_calls: number;
  blocked: number;
  stepped_up: number;
  allowed: number;
  first_flagged_call: number | null;
  risk_cards_generated: number;
  metrics: Record<string, any>;
}

export default function AttackSimPage() {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [running, setRunning] = useState<string | null>(null);
  const [results, setResults] = useState<SimResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(APIENDPOINT.AttackSimScenarios)
      .then(r => r.json())
      .then(setScenarios)
      .catch(() => setScenarios([
        { id: "normal_traffic", name: "Normal User Traffic", description: "Simulates normal user behavior", type: "benign" },
        { id: "fast_enumeration", name: "Fast Invoice Enumeration", description: "AI agent rapidly enumerates invoice IDs", type: "attack" },
      ]))
      .finally(() => setLoading(false));
  }, []);

  const runScenario = async (scenarioId: string) => {
    setRunning(scenarioId);
    try {
      const res = await fetch(`${APIENDPOINT.AttackSimRun}?scenario_id=${scenarioId}`, { method: "POST" });
      const data = await res.json();
      setResults(prev => [data, ...prev]);
    } catch (e) {
      console.error(e);
    }
    setRunning(null);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-[60vh]"><div className="w-10 h-10 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Attack Simulation</h1>
        <p className="text-white/40 text-sm mt-1">Run attack scenarios to test Sentra detection capabilities</p>
      </div>

      {/* Scenario Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {scenarios.map((scenario) => (
          <div key={scenario.id} className={`p-6 rounded-2xl border backdrop-blur-xl transition-all ${
            scenario.type === "attack"
              ? "bg-red-500/5 border-red-500/10 hover:border-red-500/20"
              : "bg-emerald-500/5 border-emerald-500/10 hover:border-emerald-500/20"
          }`}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                {scenario.type === "attack" ? (
                  <AlertTriangle size={20} className="text-red-400" />
                ) : (
                  <CheckCircle size={20} className="text-emerald-400" />
                )}
                <h3 className="font-semibold">{scenario.name}</h3>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wider ${
                scenario.type === "attack" ? "bg-red-500/20 text-red-400" : "bg-emerald-500/20 text-emerald-400"
              }`}>
                {scenario.type}
              </span>
            </div>
            <p className="text-sm text-white/50 mb-4">{scenario.description}</p>
            <button
              onClick={() => runScenario(scenario.id)}
              disabled={running !== null}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/70 text-sm font-medium hover:bg-white/10 transition-all disabled:opacity-50"
            >
              {running === scenario.id ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
              {running === scenario.id ? "Running..." : "Run Scenario"}
            </button>
          </div>
        ))}
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2"><Zap size={18} className="text-yellow-400" /> Simulation Results</h2>
          {results.map((result, i) => (
            <div key={i} className="p-6 rounded-2xl bg-[#0d1117]/80 border border-white/5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium">{result.scenario_id.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}</h3>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  result.blocked > 0 ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
                }`}>
                  {result.blocked > 0 ? "✓ Attack Caught" : "✗ Attack Missed"}
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <StatBlock label="Total Calls" value={result.total_calls} />
                <StatBlock label="Blocked" value={result.blocked} color="red" />
                <StatBlock label="Step-Up" value={result.stepped_up} color="yellow" />
                <StatBlock label="Allowed" value={result.allowed} color="emerald" />
                <StatBlock label="First Flagged" value={result.first_flagged_call ?? "N/A"} color="blue" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatBlock({ label, value, color = "white" }: { label: string; value: string | number; color?: string }) {
  const colors: Record<string, string> = {
    red: "text-red-400", yellow: "text-yellow-400", emerald: "text-emerald-400",
    blue: "text-blue-400", white: "text-white",
  };
  return (
    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
      <p className={`text-xl font-bold tabular-nums ${colors[color]}`}>{value}</p>
      <p className="text-[10px] text-white/30 uppercase tracking-wider mt-1">{label}</p>
    </div>
  );
}
