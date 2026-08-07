"use client";

import { useState, useEffect } from "react";

/* ---------- Mock data generators ---------- */

function randomBetween(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

const identities = [
    "agent-alpha-7",
    "svc-account-billing",
    "user:jane.doe@corp.io",
    "mcp-server-analytics",
    "api-key:prod-0x3f",
    "agent-recon-12",
    "svc-account-export",
    "user:admin@corp.io",
];

const endpoints = [
    "GET /api/v1/users",
    "POST /api/v1/export",
    "GET /api/v1/billing/invoices",
    "GET /api/v1/tenants",
    "POST /api/v1/agents/deploy",
    "GET /api/v1/secrets",
    "DELETE /api/v1/users/:id",
    "PATCH /api/v1/config",
];

const patterns = [
    "enumerate→read→export",
    "credential_probing",
    "scope_violation",
    "novel_object_access",
    "cross_tenant_blast",
    "rapid_fan_out",
    "normal_access",
    "normal_access",
    "normal_access",
];

type Verdict = "allow" | "step_up" | "block";
interface ThreatEvent {
    id: string;
    timestamp: string;
    identity: string;
    endpoint: string;
    pattern: string;
    graphScore: number;
    sequenceScore: number;
    trustScore: number;
    verdict: Verdict;
}

function generateEvent(): ThreatEvent {
    const pattern = patterns[randomBetween(0, patterns.length - 1)];
    const isNormal = pattern === "normal_access";
    const graphScore = isNormal
        ? Math.random() * 0.2
        : 0.3 + Math.random() * 0.7;
    const seqScore = isNormal
        ? Math.random() * 0.15
        : 0.25 + Math.random() * 0.75;
    const trustScore = isNormal
        ? 60 + randomBetween(0, 35)
        : randomBetween(5, 50);

    let verdict: Verdict = "allow";
    if (trustScore < 30) verdict = "block";
    else if (trustScore < 60) verdict = "step_up";

    return {
        id: Math.random().toString(36).slice(2, 10),
        timestamp: new Date().toISOString().slice(11, 19),
        identity: identities[randomBetween(0, identities.length - 1)],
        endpoint: endpoints[randomBetween(0, endpoints.length - 1)],
        pattern,
        graphScore: parseFloat(graphScore.toFixed(3)),
        sequenceScore: parseFloat(seqScore.toFixed(3)),
        trustScore,
        verdict,
    };
}

/* ─── Sub-components ─── */

function TrustGauge({ score }: { score: number }) {
    const radius = 42;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;

    let color = "var(--success)";
    if (score < 30) color = "var(--danger)";
    else if (score < 60) color = "var(--warning)";

    return (
        <div className="metric-ring">
            <svg width="100" height="100" viewBox="0 0 100 100">
                <circle
                    className="ring-bg"
                    cx="50"
                    cy="50"
                    r={radius}
                    fill="none"
                    strokeWidth="6"
                />
                <circle
                    className="ring-fill"
                    cx="50"
                    cy="50"
                    r={radius}
                    fill="none"
                    stroke={color}
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-[var(--text-primary)]">
                    {score}
                </span>
                <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">
                    trust
                </span>
            </div>
        </div>
    );
}

function VerdictBadge({ verdict }: { verdict: Verdict }) {
    const cls =
        verdict === "block"
            ? "badge-danger"
            : verdict === "step_up"
                ? "badge-warning"
                : "badge-success";

    return (
        <span className={`badge ${cls}`}>
            {verdict === "step_up" ? "STEP UP" : verdict.toUpperCase()}
        </span>
    );
}

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
    const pct = Math.min((value / max) * 100, 100);
    return (
        <div className="w-full h-1.5 rounded-full bg-[rgba(45,107,207,0.08)] overflow-hidden">
            <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${pct}%`, background: color }}
            />
        </div>
    );
}

/* ─── Main Dashboard Preview ─── */

export default function DashboardPreview() {
    const [events, setEvents] = useState<ThreatEvent[]>([]);
    const [avgTrust, setAvgTrust] = useState(72);
    const [totalBlocked, setTotalBlocked] = useState(14);
    const [totalStepUps, setTotalStepUps] = useState(23);
    const [totalAllowed, setTotalAllowed] = useState(186);

    useEffect(() => {
        // Generate initial events
        const initial: ThreatEvent[] = [];
        for (let i = 0; i < 6; i++) initial.push(generateEvent());
        setEvents(initial);

        // Stream new events
        const interval = setInterval(() => {
            const newEvent = generateEvent();
            setEvents((prev) => [newEvent, ...prev.slice(0, 9)]);

            // Update counters
            if (newEvent.verdict === "block") setTotalBlocked((p) => p + 1);
            else if (newEvent.verdict === "step_up") setTotalStepUps((p) => p + 1);
            else setTotalAllowed((p) => p + 1);

            setAvgTrust((prev) => {
                const shift = newEvent.trustScore > 60 ? 1 : -1;
                return Math.max(0, Math.min(100, prev + shift));
            });
        }, 3000);

        return () => clearInterval(interval);
    }, []);

    return (
        <section id="dashboard-preview" className="relative py-28 px-6">
            {/* Section glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[1px] bg-gradient-to-r from-transparent via-[var(--accent-teal)] to-transparent opacity-30" />

            <div className="max-w-7xl mx-auto">
                {/* Section Header */}
                <div className="text-center mb-16">
                    <span className="inline-block text-xs font-semibold tracking-[0.25em] text-[var(--accent-teal)] uppercase mb-4">
                        Live Preview
                    </span>
                    <h2 className="heading-lg text-[var(--text-primary)] mb-4">
                        Security{" "}
                        <span className="text-gradient-teal">Dashboard</span>
                    </h2>
                    <p className="text-[var(--text-secondary)] max-w-xl mx-auto leading-relaxed">
                        Real-time monitoring of every request flowing through SENTRA. Watch trust scores shift and verdicts emit in real-time.
                    </p>
                </div>

                {/* Dashboard Container */}
                <div className="glass-card p-1 rounded-2xl glow-blue overflow-hidden" style={{ background: "rgba(5,5,8,0.9)" }}>
                    {/* Top Bar */}
                    <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border-subtle)]">
                        <div className="flex items-center gap-3">
                            <div className="flex gap-1.5">
                                <div className="w-3 h-3 rounded-full bg-[#e74c5a]" />
                                <div className="w-3 h-3 rounded-full bg-[#d4a23e]" />
                                <div className="w-3 h-3 rounded-full bg-[#2ec47a]" />
                            </div>
                            <span className="text-xs text-[var(--text-muted)] font-mono ml-2">
                                sentra://dashboard/live
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="pulse-dot bg-[var(--success)]" />
                            <span className="text-xs text-[var(--text-muted)]">
                                Streaming
                            </span>
                        </div>
                    </div>

                    {/* Dashboard Content */}
                    <div className="p-5 grid grid-cols-1 lg:grid-cols-4 gap-5">
                        {/* Summary Stats */}
                        <div className="lg:col-span-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                            {[
                                {
                                    label: "System Trust",
                                    value: avgTrust,
                                    unit: "/100",
                                    color:
                                        avgTrust > 60
                                            ? "var(--success)"
                                            : avgTrust > 30
                                                ? "var(--warning)"
                                                : "var(--danger)",
                                },
                                {
                                    label: "Allowed",
                                    value: totalAllowed,
                                    unit: "",
                                    color: "var(--success)",
                                },
                                {
                                    label: "Step-Ups",
                                    value: totalStepUps,
                                    unit: "",
                                    color: "var(--warning)",
                                },
                                {
                                    label: "Blocked",
                                    value: totalBlocked,
                                    unit: "",
                                    color: "var(--danger)",
                                },
                            ].map((stat) => (
                                <div
                                    key={stat.label}
                                    className="glass-card p-4 flex flex-col gap-2"
                                    style={{ border: `1px solid color-mix(in srgb, ${stat.color} 15%, transparent)` }}
                                >
                                    <span className="text-xs text-[var(--text-muted)] uppercase tracking-wider font-medium">
                                        {stat.label}
                                    </span>
                                    <div className="flex items-baseline gap-1">
                                        <span
                                            className="text-3xl font-bold tabular-nums"
                                            style={{ color: stat.color }}
                                        >
                                            {stat.value}
                                        </span>
                                        <span className="text-xs text-[var(--text-muted)]">
                                            {stat.unit}
                                        </span>
                                    </div>
                                    <MiniBar value={stat.value} max={stat.label === "System Trust" ? 100 : 300} color={stat.color} />
                                </div>
                            ))}
                        </div>

                        {/* Trust Gauge + Latest Threat */}
                        <div className="lg:col-span-1 flex flex-col gap-5">
                            {/* Gauge */}
                            <div className="glass-card trust-gauge p-6 flex flex-col items-center gap-4">
                                <span className="text-xs text-[var(--text-muted)] uppercase tracking-wider font-medium">
                                    Avg Trust Score
                                </span>
                                <TrustGauge score={avgTrust} />
                                <span className="text-xs text-[var(--text-muted)]">
                                    EWMA Smoothed
                                </span>
                            </div>

                            {/* Engine Status */}
                            <div className="glass-card p-5 flex flex-col gap-3">
                                <span className="text-xs text-[var(--text-muted)] uppercase tracking-wider font-medium mb-1">
                                    Engine Status
                                </span>
                                {[
                                    { name: "Graph Engine", status: "active" },
                                    { name: "Sequence Scorer", status: "active" },
                                    { name: "Trust Engine", status: "active" },
                                ].map((eng) => (
                                    <div key={eng.name} className="flex items-center justify-between">
                                        <span className="text-xs text-[var(--text-secondary)]">
                                            {eng.name}
                                        </span>
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-1.5 h-1.5 rounded-full bg-[var(--success)]" />
                                            <span className="text-[10px] text-[var(--success)] uppercase font-mono">
                                                {eng.status}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Live Feed */}
                        <div className="lg:col-span-3 glass-card overflow-hidden">
                            <div className="px-5 py-3 border-b border-[var(--border-subtle)] flex items-center justify-between">
                                <span className="text-xs text-[var(--text-muted)] uppercase tracking-wider font-medium">
                                    Live Request Feed
                                </span>
                                <span className="text-[10px] text-[var(--text-muted)] font-mono">
                                    {events.length} events
                                </span>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="text-[var(--text-muted)] uppercase tracking-wider">
                                            <th className="text-left px-5 py-3 font-medium">Time</th>
                                            <th className="text-left px-5 py-3 font-medium">Identity</th>
                                            <th className="text-left px-5 py-3 font-medium">Endpoint</th>
                                            <th className="text-left px-5 py-3 font-medium">Pattern</th>
                                            <th className="text-center px-5 py-3 font-medium">Graph</th>
                                            <th className="text-center px-5 py-3 font-medium">Seq</th>
                                            <th className="text-center px-5 py-3 font-medium">Trust</th>
                                            <th className="text-center px-5 py-3 font-medium">Verdict</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {events.map((event, i) => (
                                            <tr
                                                key={event.id}
                                                className={`border-t border-[var(--border-subtle)] transition-colors hover:bg-[rgba(45,107,207,0.04)] ${i === 0 ? "animate-fade-in" : ""
                                                    }`}
                                            >
                                                <td className="px-5 py-3 font-mono text-[var(--text-muted)]">
                                                    {event.timestamp}
                                                </td>
                                                <td className="px-5 py-3 text-[var(--text-secondary)] max-w-[120px] truncate">
                                                    {event.identity}
                                                </td>
                                                <td className="px-5 py-3 font-mono text-[var(--text-accent)]">
                                                    {event.endpoint}
                                                </td>
                                                <td className="px-5 py-3">
                                                    <span
                                                        className={`font-mono ${event.pattern === "normal_access"
                                                                ? "text-[var(--text-muted)]"
                                                                : "text-[var(--warning)]"
                                                            }`}
                                                    >
                                                        {event.pattern}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3 text-center font-mono text-[var(--text-secondary)]">
                                                    {event.graphScore}
                                                </td>
                                                <td className="px-5 py-3 text-center font-mono text-[var(--text-secondary)]">
                                                    {event.sequenceScore}
                                                </td>
                                                <td className="px-5 py-3 text-center">
                                                    <span
                                                        className="font-bold font-mono"
                                                        style={{
                                                            color:
                                                                event.trustScore > 60
                                                                    ? "var(--success)"
                                                                    : event.trustScore > 30
                                                                        ? "var(--warning)"
                                                                        : "var(--danger)",
                                                        }}
                                                    >
                                                        {event.trustScore}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3 text-center">
                                                    <VerdictBadge verdict={event.verdict} />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
