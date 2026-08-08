"use client";

import { useEffect, useState } from "react";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8080";

type User = { name: string; email: string };
type Metrics = { requests_scored?: number; blocked?: number; step_up?: number };
type Identity = { id: string; display_name?: string; trust_score?: number; revoked?: boolean };
type RiskCard = { id: string; identity_id: string; verdict: string; evidence: string };
type Ollama = { available?: boolean; model?: string; model_available?: boolean };

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, { credentials: "include" });
  if (!response.ok) {
    throw new Error(response.status === 401 ? "unauthenticated" : "request failed");
  }
  return response.json() as Promise<T>;
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [metrics, setMetrics] = useState<Metrics>({});
  const [identities, setIdentities] = useState<Identity[]>([]);
  const [cards, setCards] = useState<RiskCard[]>([]);
  const [ollama, setOllama] = useState<Ollama>({});
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const [session, nextMetrics, nextIdentities, nextCards, nextOllama] = await Promise.all([
          getJson<{ user: User }>("/api/v1/auth/me"),
          getJson<Metrics>("/api/v1/sentra/metrics"),
          getJson<Identity[]>("/api/v1/sentra/identities"),
          getJson<RiskCard[]>("/api/v1/sentra/risk-cards"),
          getJson<Ollama>("/api/v1/sentra/ollama"),
        ]);
        setUser(session.user);
        setMetrics(nextMetrics);
        setIdentities(nextIdentities);
        setCards(nextCards);
        setOllama(nextOllama);
      } catch (loadError) {
        if (loadError instanceof Error && loadError.message === "unauthenticated") {
          window.location.assign("/login");
          return;
        }
        setError("Security intelligence is unavailable. Confirm the Compose stack is running.");
      }
    }
    void load();
  }, []);

  async function logout() {
    await fetch(`${apiBaseUrl}/api/v1/auth/logout`, { method: "POST", credentials: "include" });
    window.location.assign("/login");
  }

  return (
    <main className="dashboard-page">
      <header className="dashboard-header">
        <div><p className="eyebrow">ZERRA CONSOLE</p><h1>Security overview</h1></div>
        <div className="session-actions"><span>{user ? user.name : "Loading session…"}</span><button onClick={logout}>Logout</button></div>
      </header>
      {error && <p className="form-error" role="alert">{error}</p>}
      <section className="metric-grid" aria-label="Security metrics">
        <article><span>Requests scored</span><strong>{metrics.requests_scored ?? 0}</strong></article>
        <article><span>Blocked</span><strong>{metrics.blocked ?? 0}</strong></article>
        <article><span>Step-up required</span><strong>{metrics.step_up ?? 0}</strong></article>
        <article><span>Ollama analyst</span><strong>{ollama.available && ollama.model_available ? "Online" : "Fallback"}</strong><small>{ollama.model ?? "not configured"}</small></article>
      </section>
      <section className="dashboard-grid">
        <article className="panel"><h2>Identity trust</h2><div className="panel-list">{identities.map((identity) => <p key={identity.id}><span>{identity.display_name ?? identity.id}</span><strong>{identity.revoked ? "Revoked" : `${Math.round(identity.trust_score ?? 0)} trust`}</strong></p>)}{identities.length === 0 && <p>No identities observed yet.</p>}</div></article>
        <article className="panel"><h2>Recent risk cards</h2><div className="panel-list">{cards.slice(0, 8).map((card) => <p key={card.id}><span><b>{card.verdict}</b> · {card.identity_id}</span><small>{card.evidence}</small></p>)}{cards.length === 0 && <p>No risk cards yet. Traffic evaluated by SENTRA appears here.</p>}</div></article>
      </section>
    </main>
  );
}
