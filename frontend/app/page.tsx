"use client";

import { useCallback, useEffect, useState } from "react";

const apiBase = process.env.NEXT_PUBLIC_SENTRA_URL ?? "http://127.0.0.1:8000";

type Identity = { id: string; display_name?: string; type: string; tenant_id: string; trust_score: number; is_revoked: boolean };
type Metrics = { requests_scored: number; attacks_detected: number; false_positives: number; p95_latency_ms: number; blocked_count: number; step_up_count: number; allowed_count: number; detection_rate: number | null; first_flagged_call_by_scenario: Record<string, number> };
type Card = { id: string; identity_id: string; verdict: string; confidence: number; owasp_tag: string; mitre_tag: string; evidence: string; trust_score: number };

function trustColor(score: number) {
  return score < 40 ? "text-rose-300" : score < 70 ? "text-amber-300" : "text-emerald-300";
}

export default function Home() {
  const [identities, setIdentities] = useState<Identity[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [identityResponse, metricsResponse, cardsResponse] = await Promise.all([
        fetch(`${apiBase}/v1/identities`), fetch(`${apiBase}/v1/metrics`), fetch(`${apiBase}/v1/risk-cards`),
      ]);
      if (!identityResponse.ok || !metricsResponse.ok || !cardsResponse.ok) throw new Error("Inference service is unavailable");
      setIdentities(await identityResponse.json());
      setMetrics(await metricsResponse.json());
      setCards(await cardsResponse.json());
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load SENTRA data");
    }
  }, []);

  useEffect(() => { load(); const timer = window.setInterval(load, 2500); return () => window.clearInterval(timer); }, [load]);
  const toggleKillSwitch = async (identity: Identity) => { await fetch(`${apiBase}/v1/identities/${identity.id}/${identity.is_revoked ? "restore" : "revoke"}`, { method: "POST" }); await load(); };

  return <main className="min-h-screen bg-slate-950 px-5 py-8 text-slate-100 md:px-10">
    <header className="mx-auto mb-8 flex max-w-7xl items-end justify-between border-b border-slate-800 pb-6">
      <div><p className="text-xs font-bold tracking-[0.25em] text-cyan-400">ZERO TRUST API SECURITY</p><h1 className="mt-2 text-4xl font-bold">SENTRA Command Center</h1></div>
      <div className="text-right text-sm text-slate-400"><p>Inference: <span className={error ? "text-rose-300" : "text-emerald-300"}>{error ?? "online"}</span></p><p className="mt-1">{apiBase}</p></div>
    </header>

    <section className="mx-auto grid max-w-7xl gap-4 md:grid-cols-4">
      {[
        ["Requests scored", metrics?.requests_scored ?? 0, "text-cyan-300"],
        ["Attacks detected", metrics?.attacks_detected ?? 0, "text-rose-300"],
        ["False positives", metrics?.false_positives ?? 0, "text-amber-300"],
        ["p95 inference", `${(metrics?.p95_latency_ms ?? 0).toFixed(2)} ms`, "text-emerald-300"],
      ].map(([label, value, color]) => <div key={String(label)} className="rounded-xl border border-slate-800 bg-slate-900 p-5"><p className="text-sm text-slate-400">{label}</p><p className={`mt-2 text-3xl font-bold ${color}`}>{value}</p></div>)}
    </section>

    <section className="mx-auto mt-8 grid max-w-7xl gap-8 lg:grid-cols-[1.1fr_1.9fr]">
      <div><h2 className="mb-3 text-xl font-semibold">Identity trust</h2><div className="space-y-3">
        {identities.map((identity) => <article key={identity.id} className="rounded-xl border border-slate-800 bg-slate-900 p-4"><div className="flex items-center justify-between"><div><h3 className="font-semibold">{identity.display_name ?? identity.id}</h3><p className="text-xs text-slate-400">{identity.type} · {identity.tenant_id}</p></div><button onClick={() => toggleKillSwitch(identity)} className={`rounded-md px-3 py-2 text-xs font-bold ${identity.is_revoked ? "bg-emerald-500/20 text-emerald-200" : "bg-rose-500/20 text-rose-200"}`}>{identity.is_revoked ? "Restore" : "Kill switch"}</button></div><div className="mt-4 flex items-end justify-between"><p className={`text-3xl font-bold ${trustColor(identity.trust_score)}`}>{identity.trust_score.toFixed(0)}</p><p className="text-xs uppercase tracking-wider text-slate-500">trust score</p></div></article>)}
      </div></div>
      <div><div className="mb-3 flex items-center justify-between"><h2 className="text-xl font-semibold">Explainable Risk Cards</h2><span className="text-sm text-slate-400">allow {metrics?.allowed_count ?? 0} · step-up {metrics?.step_up_count ?? 0} · block {metrics?.blocked_count ?? 0}</span></div>
        <div className="space-y-3">{cards.length === 0 ? <div className="rounded-xl border border-dashed border-slate-700 p-10 text-center text-slate-500">No security events yet. Run the attacker simulation to generate a Risk Card.</div> : cards.map((card) => <article key={card.id} className="rounded-xl border border-rose-500/30 bg-slate-900 p-5"><div className="flex justify-between gap-4"><div><p className="font-bold text-rose-300">{card.verdict.toUpperCase()} · {card.identity_id}</p><p className="mt-1 text-sm text-slate-400">{card.owasp_tag} · {card.mitre_tag}</p></div><p className="text-2xl font-bold text-amber-200">{Math.round(card.confidence * 100)}%</p></div><p className="mt-4 text-sm leading-6 text-slate-200">{card.evidence}</p></article>)}</div>
      </div>
    </section>
  </main>;
}
