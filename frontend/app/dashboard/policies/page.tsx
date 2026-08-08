"use client";

import { useEffect, useState } from "react";
import { APIENDPOINT } from "@/config/Backend";
import { ScrollText, RefreshCw } from "lucide-react";

export default function PoliciesPage() {
  const [policies, setPolicies] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPolicies = async () => {
    try {
      const res = await fetch(APIENDPOINT.Policies);
      const data = await res.json();
      setPolicies(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    // eslint-disable-next-line react-hooks/exhaustive-deps
    fetchPolicies(); 
  }, []);

  const statusColor = (s: string) => {
    if (s === "active") return "bg-emerald-500/20 text-emerald-400 border-emerald-500/20";
    if (s === "simulated") return "bg-yellow-500/20 text-yellow-400 border-yellow-500/20";
    return "bg-white/10 text-white/40 border-white/10";
  };

  if (loading) {
    return <div className="flex items-center justify-center h-[60vh]"><div className="w-10 h-10 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Policies</h1>
          <p className="text-white/40 text-sm mt-1">Active security policies and enforcement rules</p>
        </div>
        <button onClick={fetchPolicies} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/60 text-sm hover:bg-white/10 transition-all">
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {policies.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-white/20">
          <ScrollText size={64} />
          <p className="mt-4 text-lg">No policies configured</p>
          <p className="text-sm text-white/10 mt-1">Policies are auto-generated from risk card recommendations</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {policies.map((policy, i) => (
            <div key={policy.id || i} className="p-6 rounded-2xl bg-[#0d1117]/80 border border-white/5 hover:border-white/10 transition-all">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">{policy.name || `Policy ${i + 1}`}</h3>
                <span className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${statusColor(policy.status || "draft")}`}>
                  {(policy.status || "draft").toUpperCase()}
                </span>
              </div>
              <p className="text-sm text-white/50 mb-3">{policy.description || "No description"}</p>
              <div className="flex items-center gap-4 text-xs text-white/30">
                <span>Type: <span className="text-white/50">{policy.rule_type || "unknown"}</span></span>
                <span>Version: <span className="text-white/50">{policy.version || 1}</span></span>
              </div>
              {policy.parameters && (
                <pre className="mt-3 p-3 rounded-xl bg-white/[0.02] text-xs text-white/40 overflow-x-auto">
                  {JSON.stringify(policy.parameters, null, 2)}
                </pre>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
