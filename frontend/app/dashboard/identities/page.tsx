"use client";

import { useEffect, useState, useCallback } from "react";
import { APIENDPOINT } from "@/config/Backend";
import { Users, ShieldOff, ShieldCheck, RefreshCw, Loader2 } from "lucide-react";

interface Identity {
  id: string;
  type: string;
  display_name: string | null;
  trust_score: number;
  is_revoked: boolean;
  auth_strength: number;
  tenant_id: string;
  scope_contract: string[];
}

export default function IdentitiesPage() {
  const [identities, setIdentities] = useState<Identity[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchIdentities = useCallback(async () => {
    try {
      const res = await fetch(APIENDPOINT.Identities);
      const data = await res.json();
      setIdentities(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIdentities();
    const interval = setInterval(fetchIdentities, 5000);
    return () => clearInterval(interval);
  }, [fetchIdentities]);

  const toggleRevoke = async (id: string, isRevoked: boolean) => {
    setActionLoading(id);
    try {
      const url = isRevoked ? APIENDPOINT.RestoreIdentity(id) : APIENDPOINT.RevokeIdentity(id);
      await fetch(url, { method: "POST" });
      await fetchIdentities();
    } catch (e) {
      console.error(e);
    }
    setActionLoading(null);
  };

  const typeColors: Record<string, string> = {
    human: "bg-blue-500/20 text-blue-400 border-blue-500/20",
    agent: "bg-purple-500/20 text-purple-400 border-purple-500/20",
    service: "bg-cyan-500/20 text-cyan-400 border-cyan-500/20",
    mcp_server: "bg-orange-500/20 text-orange-400 border-orange-500/20",
  };

  const trustColor = (score: number) => {
    if (score >= 70) return "text-emerald-400";
    if (score >= 40) return "text-yellow-400";
    return "text-red-400";
  };

  if (loading) {
    return <div className="flex items-center justify-center h-[60vh]"><div className="w-10 h-10 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Identities</h1>
          <p className="text-white/40 text-sm mt-1">Manage humans, services, agents, and MCP servers</p>
        </div>
        <button onClick={fetchIdentities} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/60 text-sm hover:bg-white/10 transition-all">
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      <div className="bg-[#0d1117]/80 backdrop-blur-xl rounded-2xl border border-white/5 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5">
              <th className="text-left text-xs text-white/30 font-medium p-4">Identity</th>
              <th className="text-left text-xs text-white/30 font-medium p-4">Type</th>
              <th className="text-left text-xs text-white/30 font-medium p-4">Tenant</th>
              <th className="text-left text-xs text-white/30 font-medium p-4">Auth Strength</th>
              <th className="text-left text-xs text-white/30 font-medium p-4">Trust Score</th>
              <th className="text-left text-xs text-white/30 font-medium p-4">Scope Contract</th>
              <th className="text-left text-xs text-white/30 font-medium p-4">Status</th>
              <th className="text-right text-xs text-white/30 font-medium p-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {identities.map((identity) => (
              <tr key={identity.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                <td className="p-4">
                  <p className="text-sm font-medium">{identity.display_name || identity.id}</p>
                  <p className="text-xs text-white/30">{identity.id}</p>
                </td>
                <td className="p-4">
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${typeColors[identity.type] || typeColors.human}`}>
                    {identity.type}
                  </span>
                </td>
                <td className="p-4 text-sm text-white/50">{identity.tenant_id}</td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 rounded-full bg-white/5">
                      <div className="h-full rounded-full bg-blue-500" style={{ width: `${identity.auth_strength * 100}%` }} />
                    </div>
                    <span className="text-xs text-white/40">{(identity.auth_strength * 100).toFixed(0)}%</span>
                  </div>
                </td>
                <td className="p-4">
                  <span className={`text-lg font-bold tabular-nums ${trustColor(identity.trust_score)}`}>
                    {identity.trust_score.toFixed(0)}
                  </span>
                </td>
                <td className="p-4">
                  <div className="flex flex-wrap gap-1">
                    {(identity.scope_contract || []).length > 0 ? (
                      identity.scope_contract.map((s, i) => (
                        <span key={i} className="px-1.5 py-0.5 rounded text-[10px] bg-white/5 text-white/40">{s}</span>
                      ))
                    ) : (
                      <span className="text-xs text-white/20">unrestricted</span>
                    )}
                  </div>
                </td>
                <td className="p-4">
                  {identity.is_revoked ? (
                    <span className="flex items-center gap-1.5 text-xs text-red-400"><ShieldOff size={14} /> Revoked</span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-xs text-emerald-400"><ShieldCheck size={14} /> Active</span>
                  )}
                </td>
                <td className="p-4 text-right">
                  <button
                    onClick={() => toggleRevoke(identity.id, identity.is_revoked)}
                    disabled={actionLoading === identity.id}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      identity.is_revoked
                        ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20"
                        : "bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20"
                    } disabled:opacity-50`}
                  >
                    {actionLoading === identity.id ? <Loader2 size={14} className="animate-spin" /> : (identity.is_revoked ? "Restore" : "Revoke")}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
