"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

type User = { name: string; email: string };
type Metrics = {
  requests_scored: number;
  blocked_count: number;
  step_up_count: number;
  allowed_count: number;
  attacks_detected: number;
  p95_latency_ms: number;
};
type Identity = {
  id: string;
  display_name?: string;
  type: string;
  tenant_id: string;
  trust_score: number;
  is_revoked: boolean;
};
type RiskCard = {
  id: string;
  identity_id: string;
  verdict: "allow" | "step_up" | "block";
  confidence: number;
  trust_score: number;
  evidence: string;
  timestamp: string;
  owasp_tag: string;
};
type TrafficLog = {
  id: string;
  method: string;
  path: string;
  verdict: string;
  status: string;
  subdomain: string;
  received_at: string;
};
type Ollama = { available?: boolean; model?: string; model_available?: boolean };
type Investigation = {
  incident_summary: string;
  severity: string;
  source: string;
  recommended_actions: string[];
};
type SimulationResult = { total_calls: number; blocked: number; first_flagged_call?: number | null };

class ApiError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, { credentials: "include", ...init });
  const payload = await response.json().catch(() => ({})) as T & { error?: string };
  if (!response.ok) {
    throw new ApiError(response.status, payload.error ?? "The request could not be completed.");
  }
  return payload;
}

function formatTime(value?: string) {
  if (!value) return "Just now";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Just now" : date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function verdictLabel(verdict: string) {
  return verdict === "block" ? "Blocked" : verdict === "step_up" ? "Step-up" : "Allowed";
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [identities, setIdentities] = useState<Identity[]>([]);
  const [cards, setCards] = useState<RiskCard[]>([]);
  const [logs, setLogs] = useState<TrafficLog[]>([]);
  const [ollama, setOllama] = useState<Ollama>({});
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [busyId, setBusyId] = useState("");
  const [investigation, setInvestigation] = useState<Investigation | null>(null);
  const [scenario, setScenario] = useState("fast_enumeration");
  const [simulation, setSimulation] = useState<SimulationResult | null>(null);

  const loadDashboard = useCallback(async (showLoading = false, clearMessage = true) => {
    if (showLoading) setLoading(true);
    try {
      const [session, nextMetrics, nextIdentities, nextCards, nextLogs, nextOllama] = await Promise.all([
        request<{ user: User }>("/api/v1/auth/me"),
        request<Metrics>("/api/v1/sentra/metrics"),
        request<Identity[]>("/api/v1/sentra/identities"),
        request<RiskCard[]>("/api/v1/sentra/risk-cards"),
        request<TrafficLog[]>("/api/v1/sentra/logs"),
        request<Ollama>("/api/v1/sentra/ollama"),
      ]);
      setUser(session.user);
      setMetrics(nextMetrics);
      setIdentities(nextIdentities);
      setCards(nextCards);
      setLogs(nextLogs);
      setOllama(nextOllama);
      setLastUpdated(new Date());
      if (clearMessage) setMessage("");
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        window.location.assign("/login");
        return;
      }
      setMessage(error instanceof Error ? error.message : "Security intelligence is unavailable.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard(true);
    const interval = window.setInterval(() => void loadDashboard(), 15000);
    return () => window.clearInterval(interval);
  }, [loadDashboard]);

  const securityPosture = useMemo(() => {
    if (!metrics || metrics.requests_scored === 0) return "Awaiting traffic";
    if (metrics.blocked_count > 0) return "Threats contained";
    return "Healthy";
  }, [metrics]);

  async function toggleIdentity(identity: Identity) {
    if (!identity.is_revoked && !window.confirm(`Revoke ${identity.display_name ?? identity.id}? Requests from this identity will be denied until it is restored.`)) {
      return;
    }
    setBusyId(identity.id);
    try {
      const action = identity.is_revoked ? "restore" : "revoke";
      await request(`/api/v1/sentra/identities/${identity.id}/${action}`, { method: "POST" });
      setMessage(`${identity.display_name ?? identity.id} was ${action}d.`);
      await loadDashboard(false, false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Identity action failed.");
    } finally {
      setBusyId("");
    }
  }

  async function investigate(card: RiskCard) {
    setBusyId(card.id);
    try {
      const result = await request<Investigation>(`/api/v1/sentra/risk-cards/${card.id}/investigate`, { method: "POST" });
      setInvestigation(result);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Investigation failed.");
    } finally {
      setBusyId("");
    }
  }

  async function runSimulation() {
    setBusyId("simulation");
    try {
      const result = await request<SimulationResult>(`/api/v1/sentra/attack-sim/run?scenario_id=${scenario}`, { method: "POST" });
      setSimulation(result);
      setMessage("Simulation completed. Dashboard data has been refreshed.");
      await loadDashboard(false, false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Simulation failed.");
    } finally {
      setBusyId("");
    }
  }

  async function logout() {
    await fetch(`${apiBaseUrl}/api/v1/auth/logout`, { method: "POST", credentials: "include" });
    window.location.assign("/login");
  }

  return (
    <main className="console-page">
      <aside className="console-sidebar">
        <a className="console-brand" href="/dashboard"><span>Z</span> zerra</a>
        <nav aria-label="Console navigation">
          <a className="active" href="#overview">Overview</a>
          <a href="#identities">Identities</a>
          <a href="#incidents">Incidents</a>
          <a href="#activity">Activity</a>
        </nav>
        <div className="sidebar-status"><span className={ollama.available && ollama.model_available ? "status-dot online" : "status-dot"} />
          <p>Analyst engine<br /><strong>{ollama.available && ollama.model_available ? "Ollama online" : "Safe fallback"}</strong></p>
        </div>
      </aside>

      <div className="console-content" id="overview">
        <header className="console-header">
          <div><p className="eyebrow">SECURITY OPERATIONS</p><h1>Good {new Date().getHours() < 12 ? "morning" : "afternoon"}, {user?.name?.split(" ")[0] ?? "operator"}.</h1><p className="header-copy">Your zero-trust controls are watching every protected request.</p></div>
          <div className="header-actions"><button className="quiet-button" onClick={() => void loadDashboard(true)} disabled={loading}>{loading ? "Refreshing..." : "Refresh"}</button><button className="avatar-button" onClick={logout} title="Log out" aria-label="Log out">{user?.name?.charAt(0).toUpperCase() ?? "?"}</button></div>
        </header>

        {message && <div className="console-notice" role="status"><span>{message}</span><button onClick={() => setMessage("")} aria-label="Dismiss message">x</button></div>}

        <section className="posture-banner">
          <div><span className="posture-label">LIVE POSTURE</span><h2>{securityPosture}</h2><p>{metrics?.blocked_count ?? 0} blocked request{metrics?.blocked_count === 1 ? "" : "s"} across {metrics?.requests_scored ?? 0} evaluated calls.</p></div>
          <div className="posture-meta"><span className="pulse" />Live protection <small>{lastUpdated ? `Updated ${formatTime(lastUpdated.toISOString())}` : "Connecting..."}</small></div>
        </section>

        <section className="metrics-row" aria-label="Live security metrics">
          <article><span>Requests analyzed</span><strong>{metrics?.requests_scored ?? "--"}</strong><small>{metrics ? `${metrics.p95_latency_ms.toFixed(1)} ms p95 decision time` : "Loading telemetry"}</small></article>
          <article><span>Threats blocked</span><strong className="danger-number">{metrics?.blocked_count ?? "--"}</strong><small>{metrics?.attacks_detected ?? 0} confirmed detections</small></article>
          <article><span>Step-up challenges</span><strong>{metrics?.step_up_count ?? "--"}</strong><small>Additional verification required</small></article>
          <article><span>Protected identities</span><strong>{identities.length || "--"}</strong><small>{identities.filter((identity) => identity.is_revoked).length} currently revoked</small></article>
        </section>

        <section className="console-layout">
          <article className="console-panel identities-panel" id="identities">
            <div className="panel-heading"><div><p className="eyebrow">ACCESS CONTROL</p><h2>Identity trust</h2></div><span>{identities.length} active records</span></div>
            <div className="identity-list">
              {identities.map((identity) => <div className="identity-row" key={identity.id}>
                <div className="identity-avatar">{(identity.display_name ?? identity.id).charAt(0)}</div>
                <div className="identity-name"><strong>{identity.display_name ?? identity.id}</strong><span>{identity.type} / {identity.tenant_id}</span></div>
                <div className="trust-meter"><span>{Math.round(identity.trust_score)} trust</span><i><b style={{ width: `${identity.trust_score}%` }} /></i></div>
                <button className={identity.is_revoked ? "restore-button" : "revoke-button"} onClick={() => void toggleIdentity(identity)} disabled={busyId === identity.id}>{busyId === identity.id ? "Working..." : identity.is_revoked ? "Restore" : "Revoke"}</button>
              </div>)}
              {!loading && identities.length === 0 && <p className="empty-state">No identities have reported activity yet.</p>}
            </div>
          </article>

          <aside className="simulation-card">
            <p className="eyebrow">CONTROLLED TEST</p><h2>Validate your defenses</h2><p>Run a safe synthetic scenario against the live policy engine.</p>
            <label htmlFor="scenario">Scenario</label>
            <select id="scenario" value={scenario} onChange={(event) => setScenario(event.target.value)}><option value="fast_enumeration">Fast invoice enumeration</option><option value="normal_traffic">Normal user traffic</option></select>
            <button className="primary-action" onClick={() => void runSimulation()} disabled={busyId === "simulation"}>{busyId === "simulation" ? "Running simulation..." : "Run simulation"}</button>
            {simulation && <div className="simulation-result"><strong>{simulation.blocked} blocked of {simulation.total_calls}</strong><span>{simulation.first_flagged_call ? `First flagged call: ${simulation.first_flagged_call}` : "No calls were flagged"}</span></div>}
          </aside>
        </section>

        <section className="console-layout incidents-layout" id="incidents">
          <article className="console-panel incident-panel"><div className="panel-heading"><div><p className="eyebrow">INCIDENT QUEUE</p><h2>Recent risk cards</h2></div><span>{cards.length} total</span></div>
            <div className="incident-list">{cards.slice(0, 6).map((card) => <div className="incident-row" key={card.id}><span className={`verdict-badge ${card.verdict}`}>{verdictLabel(card.verdict)}</span><div><strong>{card.identity_id}</strong><p>{card.evidence}</p><small>{card.owasp_tag} / {formatTime(card.timestamp)}</small></div><button className="investigate-button" onClick={() => void investigate(card)} disabled={busyId === card.id}>{busyId === card.id ? "Analyzing..." : "Investigate"}</button></div>)}{!loading && cards.length === 0 && <p className="empty-state">No risk cards. Run a simulation to test detection.</p>}</div>
          </article>
          <article className="console-panel analyst-panel"><p className="eyebrow">ANALYST NOTES</p><h2>{investigation ? `${investigation.severity} assessment` : "Select an incident"}</h2>{investigation ? <><p>{investigation.incident_summary}</p><span className="analyst-source">{investigation.source === "ollama" ? "Generated by Ollama" : "Deterministic safe fallback"}</span><ul>{investigation.recommended_actions.map((action) => <li key={action}>{action}</li>)}</ul></> : <p>Investigate a Risk Card to produce an evidence-bound incident assessment and recommended next actions.</p>}</article>
        </section>

        <section className="console-panel activity-panel" id="activity"><div className="panel-heading"><div><p className="eyebrow">GATEWAY ACTIVITY</p><h2>Recent protected requests</h2></div><span>{logs.length} records</span></div><div className="activity-table"><div className="activity-labels"><span>Request</span><span>Gateway</span><span>Decision</span><span>Time</span></div>{logs.slice(0, 8).map((log) => <div className="activity-row" key={log.id}><strong><em>{log.method}</em>{log.path}</strong><span>{log.subdomain}</span><span className={`verdict-text ${log.verdict}`}>{verdictLabel(log.verdict)}</span><time>{formatTime(log.received_at)}</time></div>)}{!loading && logs.length === 0 && <p className="empty-state">Gateway activity will appear once protected traffic reaches a registered route.</p>}</div></section>
      </div>
    </main>
  );
}
