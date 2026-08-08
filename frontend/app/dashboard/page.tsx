"use client";

import { useEffect, useState, useCallback } from "react";
import { APIENDPOINT } from "@/config/Backend";
import {
  Shield, Activity, AlertTriangle, Clock, Users,
  RefreshCw
} from "lucide-react";

interface Metrics {
  requests_scored: number;
  detection_rate: number | null;
  false_positives: number;
  p95_latency_ms: number;
  total_attacks: number;
  total_blocks: number;
}

interface RiskCard {
  id: string;
  identity_id: string;
  verdict: string;
  confidence: number;
  owasp_tag: string;
  mitre_tag: string;
  evidence: string;
  trust_score: number;
  graph_risk_score: number;
  sequence_risk_score: number;
  timestamp: string;
}

interface TrustScore {
  identity_id: string;
  identity_type: string;
  display_name: string;
  trust_score: number;
  is_revoked: boolean;
}

interface Identity {
  id: string;
  type: string;
  display_name: string | null;
  trust_score: number;
  is_revoked: boolean;
  auth_strength: number;
  tenant_id: string;
}

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [riskCards, setRiskCards] = useState<RiskCard[]>([]);
  const [trustScores, setTrustScores] = useState<TrustScore[]>([]);
  const [identities, setIdentities] = useState<Identity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      const [metricsRes, cardsRes, trustRes, idRes] = await Promise.all([
        fetch(APIENDPOINT.Metrics).then(r => r.ok ? r.json() : null).catch(() => null),
        fetch(APIENDPOINT.RiskCards).then(r => r.ok ? r.json() : []).catch(() => []),
        fetch(APIENDPOINT.TrustScores).then(r => r.ok ? r.json() : []).catch(() => []),
        fetch(APIENDPOINT.Identities).then(r => r.ok ? r.json() : []).catch(() => []),
      ]);
      if (metricsRes) setMetrics(metricsRes);
      setRiskCards(cardsRes);
      setTrustScores(trustRes);
      setIdentities(idRes);
    } catch (e) {
      console.error("Failed to fetch dashboard data", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line
    fetchAll();
    const interval = setInterval(fetchAll, 3000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAll();
  };

  const trustColor = (score: number) => {
    if (score >= 70) return "text-emerald-400";
    if (score >= 40) return "text-yellow-400";
    return "text-red-400";
  };

  const trustBg = (score: number) => {
    if (score >= 70) return "from-emerald-500/20 to-emerald-500/5";
    if (score >= 40) return "from-yellow-500/20 to-yellow-500/5";
    return "from-red-500/20 to-red-500/5";
  };

  const verdictColor = (v: string) => {
    if (v === "block") return "bg-red-500/20 text-red-400 border-red-500/30";
    if (v === "step_up") return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
          <p className="text-white/40 text-sm">Loading Sentra Engine...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Security Overview</h1>
          <p className="text-white/40 text-sm mt-1">Real-time threat detection and trust scoring</p>
        </div>
        <button
          onClick={handleRefresh}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-all text-sm ${refreshing ? 'animate-spin-slow' : ''}`}
        >
          <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={<Activity size={20} />}
          label="Requests Scored"
          value={metrics?.requests_scored ?? 0}
          color="blue"
        />
        <MetricCard
          icon={<Shield size={20} />}
          label="Detection Rate"
          value={metrics?.detection_rate != null ? `${(metrics.detection_rate * 100).toFixed(0)}%` : "N/A"}
          color="emerald"
        />
        <MetricCard
          icon={<AlertTriangle size={20} />}
          label="False Positives"
          value={metrics?.false_positives ?? 0}
          color="yellow"
        />
        <MetricCard
          icon={<Clock size={20} />}
          label="p95 Latency"
          value={metrics?.p95_latency_ms != null ? `${metrics.p95_latency_ms.toFixed(2)}ms` : "N/A"}
          color="cyan"
        />
      </div>

      {/* Trust Scores + Risk Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trust Scores */}
        <div className="bg-[#0d1117]/80 backdrop-blur-xl rounded-2xl border border-white/5 p-6">
          <div className="flex items-center gap-2 mb-6">
            <Users size={18} className="text-blue-400" />
            <h2 className="text-lg font-semibold">Identity Trust Scores</h2>
          </div>
          <div className="space-y-3">
            {(trustScores.length > 0 ? trustScores : identities.map(i => ({
              identity_id: i.id,
              identity_type: i.type,
              display_name: i.display_name || i.id,
              trust_score: i.trust_score,
              is_revoked: i.is_revoked,
            }))).map((ts) => (
              <div
                key={ts.identity_id}
                className={`flex items-center justify-between p-4 rounded-xl bg-gradient-to-r ${trustBg(ts.trust_score)} border border-white/5`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold uppercase ${
                    ts.identity_type === "agent" ? "bg-purple-500/20 text-purple-400" :
                    ts.identity_type === "service" ? "bg-cyan-500/20 text-cyan-400" :
                    ts.identity_type === "mcp_server" ? "bg-orange-500/20 text-orange-400" :
                    "bg-blue-500/20 text-blue-400"
                  }`}>
                    {ts.identity_type?.charAt(0) || "?"}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{ts.display_name}</p>
                    <p className="text-xs text-white/30">{ts.identity_type}{ts.is_revoked ? " • REVOKED" : ""}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-2xl font-bold tabular-nums ${trustColor(ts.trust_score)}`}>
                    {ts.trust_score.toFixed(0)}
                  </p>
                  <p className="text-[10px] text-white/30 uppercase tracking-wider">Trust</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Risk Cards */}
        <div className="bg-[#0d1117]/80 backdrop-blur-xl rounded-2xl border border-white/5 p-6">
          <div className="flex items-center gap-2 mb-6">
            <Shield size={18} className="text-red-400" />
            <h2 className="text-lg font-semibold">Recent Risk Cards</h2>
            <span className="ml-auto text-xs px-2 py-1 rounded-full bg-red-500/20 text-red-400 border border-red-500/20">
              {riskCards.length} total
            </span>
          </div>
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
            {riskCards.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-white/20">
                <Shield size={48} />
                <p className="mt-3 text-sm">No threats detected</p>
                <p className="text-xs text-white/10 mt-1">Run an attack simulation to see risk cards</p>
              </div>
            ) : (
              riskCards.slice(0, 10).map((card) => (
                <div key={card.id} className="p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-lg text-xs font-medium border ${verdictColor(card.verdict)}`}>
                        {card.verdict.toUpperCase()}
                      </span>
                      <span className="text-xs text-white/30">{card.owasp_tag}</span>
                    </div>
                    <span className="text-xs text-white/20">
                      {new Date(card.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-sm text-white/70 mb-2 line-clamp-2">{card.evidence}</p>
                  <div className="flex items-center gap-4 text-xs text-white/30">
                    <span>Confidence: <span className="text-white/60">{(card.confidence * 100).toFixed(0)}%</span></span>
                    <span>Graph: <span className="text-white/60">{(card.graph_risk_score * 100).toFixed(0)}%</span></span>
                    <span>Sequence: <span className="text-white/60">{(card.sequence_risk_score * 100).toFixed(0)}%</span></span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ icon, label, value, color }: {
  icon: React.ReactNode; label: string; value: string | number; color: string;
}) {
  const colors: Record<string, string> = {
    blue: "from-blue-500/20 to-blue-500/5 border-blue-500/10",
    emerald: "from-emerald-500/20 to-emerald-500/5 border-emerald-500/10",
    yellow: "from-yellow-500/20 to-yellow-500/5 border-yellow-500/10",
    cyan: "from-cyan-500/20 to-cyan-500/5 border-cyan-500/10",
    red: "from-red-500/20 to-red-500/5 border-red-500/10",
  };
  const iconColors: Record<string, string> = {
    blue: "text-blue-400", emerald: "text-emerald-400", yellow: "text-yellow-400",
    cyan: "text-cyan-400", red: "text-red-400",
  };
  return (
    <div className={`p-5 rounded-2xl bg-gradient-to-br ${colors[color]} border backdrop-blur-xl`}>
      <div className="flex items-center justify-between mb-3">
        <span className={iconColors[color]}>{icon}</span>
      </div>
      <p className="text-2xl font-bold tabular-nums">{value}</p>
      <p className="text-xs text-white/40 mt-1">{label}</p>
    </div>
  );
}
