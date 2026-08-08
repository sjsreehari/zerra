"use client";

import { useEffect, useState, useCallback } from "react";
import { APIENDPOINT } from "@/config/Backend";
import { FileText, RefreshCw } from "lucide-react";

interface LogEntry {
  id: string;
  subdomain: string;
  source_ip: string;
  method: string;
  path: string;
  verdict: string;
  status: string;
  upstream_status: number;
  received_at: string;
  evaluated_at: string;
}

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    try {
      // Try Go backend first for DB logs, fall back to empty
      const res = await fetch("http://localhost:8080/api/v1/sentra/logs");
      if (res.ok) {
        const data = await res.json();
        setLogs(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line
    fetchLogs();
    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
  }, [fetchLogs]);

  const verdictColor = (v: string) => {
    if (v === "block") return "bg-red-500/20 text-red-400 border-red-500/30";
    if (v === "step_up") return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    if (v === "allow") return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
    return "bg-white/10 text-white/40 border-white/10";
  };

  if (loading) {
    return <div className="flex items-center justify-center h-[60vh]"><div className="w-10 h-10 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Traffic Logs</h1>
          <p className="text-white/40 text-sm mt-1">Real-time request and response log with verdicts</p>
        </div>
        <button onClick={fetchLogs} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/60 text-sm hover:bg-white/10 transition-all">
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      <div className="bg-[#0d1117]/80 backdrop-blur-xl rounded-2xl border border-white/5 overflow-hidden">
        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-white/20">
            <FileText size={64} />
            <p className="mt-4 text-lg">No traffic logs yet</p>
            <p className="text-sm text-white/10 mt-1">Traffic through the Go gateway will appear here</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left text-xs text-white/30 font-medium p-4">Time</th>
                <th className="text-left text-xs text-white/30 font-medium p-4">Method</th>
                <th className="text-left text-xs text-white/30 font-medium p-4">Path</th>
                <th className="text-left text-xs text-white/30 font-medium p-4">Subdomain</th>
                <th className="text-left text-xs text-white/30 font-medium p-4">Verdict</th>
                <th className="text-left text-xs text-white/30 font-medium p-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                  <td className="p-4 text-xs text-white/40 font-mono">
                    {log.received_at ? new Date(log.received_at).toLocaleTimeString() : "-"}
                  </td>
                  <td className="p-4">
                    <span className="px-2 py-0.5 rounded text-xs font-mono bg-white/5 text-white/60">{log.method}</span>
                  </td>
                  <td className="p-4 text-sm text-white/60 font-mono">{log.path}</td>
                  <td className="p-4 text-sm text-white/40">{log.subdomain}</td>
                  <td className="p-4">
                    <span className={`px-2 py-0.5 rounded-lg text-xs font-medium border ${verdictColor(log.verdict)}`}>
                      {(log.verdict || "pending").toUpperCase()}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-white/40">{log.upstream_status || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
