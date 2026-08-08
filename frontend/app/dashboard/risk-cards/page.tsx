"use client";

import { useEffect, useState } from "react";
import { APIENDPOINT } from "@/config/Backend";
import { Shield, Search, FileText, Lightbulb, CheckCircle, Loader2 } from "lucide-react";

interface RiskCard {
  id: string;
  identity_id: string;
  call_ids: string[];
  verdict: string;
  confidence: number;
  owasp_tag: string;
  mitre_tag: string;
  evidence: string;
  trust_score: number;
  graph_risk_score: number;
  sequence_risk_score: number;
  timestamp: string;
  factors: Array<{ label: string; value: string }>;
}

export default function RiskCardsPage() {
  const [cards, setCards] = useState<RiskCard[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [investigating, setInvestigating] = useState<string | null>(null);
  const [investigation, setInvestigation] = useState<Record<string, unknown>>({});
  const [recommending, setRecommending] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<Record<string, unknown>>({});
  const [approving, setApproving] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(APIENDPOINT.RiskCards)
      .then(r => r.json())
      .then(setCards)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const investigate = async (id: string) => {
    setInvestigating(id);
    try {
      const res = await fetch(APIENDPOINT.InvestigateRiskCard(id), { method: "POST" });
      const data = await res.json();
      setInvestigation(prev => ({ ...prev, [id]: data }));
    } catch {
      setInvestigation(prev => ({ ...prev, [id]: { error: "Investigation failed" } }));
    }
    setInvestigating(null);
  };

  const recommend = async (id: string) => {
    setRecommending(id);
    try {
      const res = await fetch(APIENDPOINT.PolicyRecommendation(id), { method: "POST" });
      const data = await res.json();
      setRecommendations(prev => ({ ...prev, [id]: data }));
    } catch {
      setRecommendations(prev => ({ ...prev, [id]: { error: "Recommendation failed" } }));
    }
    setRecommending(null);
  };

  const approve = async (recId: string, cardId: string) => {
    setApproving(recId);
    try {
      const res = await fetch(APIENDPOINT.ApprovePolicy(recId), { method: "POST" });
      const data = await res.json();
      setRecommendations(prev => ({ ...prev, [cardId]: data }));
    } catch (e) {
      console.error(e);
    }
    setApproving(null);
  };

  const verdictStyle = (v: string) => {
    if (v === "block") return "bg-red-500/20 text-red-400 border-red-500/30";
    if (v === "step_up") return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
  };

  if (loading) {
    return <div className="flex items-center justify-center h-[60vh]"><div className="w-10 h-10 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Risk Cards</h1>
        <p className="text-white/40 text-sm mt-1">Explainable threat detections with MITRE ATT&CK and OWASP mapping</p>
      </div>

      {cards.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-white/20">
          <Shield size={64} />
          <p className="mt-4 text-lg">No risk cards generated yet</p>
          <p className="text-sm text-white/10 mt-1">Run an attack simulation to generate risk cards</p>
        </div>
      ) : (
        <div className="space-y-4">
          {cards.map((card) => (
            <div key={card.id} className={`rounded-2xl border transition-all duration-300 ${
              selected === card.id ? "border-blue-500/30 bg-[#0d1117]" : "border-white/5 bg-[#0d1117]/60 hover:border-white/10"
            }`}>
              {/* Card Header */}
              <button
                onClick={() => setSelected(selected === card.id ? null : card.id)}
                className="w-full p-5 text-left"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${verdictStyle(card.verdict)}`}>
                      {card.verdict.toUpperCase()}
                    </span>
                    <span className="text-sm font-medium">{card.identity_id}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-white/40">{card.owasp_tag}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-white/40">{card.mitre_tag}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-white/30">
                    <span>Confidence: <strong className="text-white/60">{(card.confidence * 100).toFixed(0)}%</strong></span>
                    <span>{new Date(card.timestamp).toLocaleString()}</span>
                  </div>
                </div>
                <p className="text-sm text-white/60 mt-2">{card.evidence}</p>
              </button>

              {/* Expanded Detail */}
              {selected === card.id && (
                <div className="px-5 pb-5 space-y-4 border-t border-white/5 pt-4">
                  {/* Score Breakdown */}
                  <div className="grid grid-cols-3 gap-4">
                    <ScoreBar label="Trust Score" value={card.trust_score} max={100} color="blue" />
                    <ScoreBar label="Graph Risk" value={card.graph_risk_score * 100} max={100} color="red" />
                    <ScoreBar label="Sequence Risk" value={card.sequence_risk_score * 100} max={100} color="yellow" />
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => investigate(card.id)}
                      disabled={investigating === card.id}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm hover:bg-blue-500/20 transition-all disabled:opacity-50"
                    >
                      {investigating === card.id ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                      Investigate
                    </button>
                    <button
                      onClick={() => recommend(card.id)}
                      disabled={recommending === card.id}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 text-sm hover:bg-purple-500/20 transition-all disabled:opacity-50"
                    >
                      {recommending === card.id ? <Loader2 size={14} className="animate-spin" /> : <Lightbulb size={14} />}
                      Policy Recommendation
                    </button>
                    <a
                      href={APIENDPOINT.IncidentReport(card.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/60 text-sm hover:bg-white/10 transition-all"
                    >
                      <FileText size={14} />
                      Incident Report
                    </a>
                  </div>

                  {/* Investigation Result */}
                  {investigation[card.id] && (
                    <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/10">
                      <h4 className="text-sm font-semibold text-blue-400 mb-2">Investigation Result</h4>
                      <pre className="text-xs text-white/60 whitespace-pre-wrap overflow-x-auto">
                        {typeof investigation[card.id] === "string" ? investigation[card.id] : JSON.stringify(investigation[card.id], null, 2)}
                      </pre>
                    </div>
                  )}

                  {/* Policy Recommendation */}
                  {recommendations[card.id] && (
                    <div className="p-4 rounded-xl bg-purple-500/5 border border-purple-500/10">
                      <h4 className="text-sm font-semibold text-purple-400 mb-2">Policy Recommendation</h4>
                      <pre className="text-xs text-white/60 whitespace-pre-wrap mb-3">
                        {JSON.stringify(recommendations[card.id], null, 2)}
                      </pre>
                      {recommendations[card.id]?.id && !recommendations[card.id]?.approved && (
                        <button
                          onClick={() => approve(recommendations[card.id].id, card.id)}
                          disabled={approving === recommendations[card.id]?.id}
                          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm hover:bg-emerald-500/20 transition-all"
                        >
                          {approving === recommendations[card.id]?.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                          Approve & Deploy Policy
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ScoreBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = Math.min((value / max) * 100, 100);
  const barColors: Record<string, string> = {
    blue: "bg-blue-500", red: "bg-red-500", yellow: "bg-yellow-500",
    emerald: "bg-emerald-500", cyan: "bg-cyan-500",
  };
  return (
    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
      <div className="flex justify-between text-xs mb-2">
        <span className="text-white/40">{label}</span>
        <span className="text-white/60 font-medium">{value.toFixed(1)}</span>
      </div>
      <div className="w-full h-1.5 rounded-full bg-white/5">
        <div className={`h-full rounded-full ${barColors[color]} transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
