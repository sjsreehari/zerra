"use client";

export default function ArchitectureSection() {
    return (
        <section id="architecture" className="relative py-28 px-6">
            {/* Section glow line */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[1px] bg-gradient-to-r from-transparent via-[var(--accent-blue)] to-transparent opacity-30" />

            <div className="max-w-6xl mx-auto">
                {/* Section Header */}
                <div className="text-center mb-16">
                    <span className="inline-block text-xs font-semibold tracking-[0.25em] text-[var(--accent-blue)] uppercase mb-4">
                        System Design
                    </span>
                    <h2 className="heading-lg text-[var(--text-primary)] mb-4">
                        Request{" "}
                        <span className="text-gradient-blue">Architecture</span>
                    </h2>
                    <p className="text-[var(--text-secondary)] max-w-xl mx-auto leading-relaxed">
                        End-to-end flow from API request to policy decision, designed for transparency and auditability.
                    </p>
                </div>

                {/* Architecture Diagram */}
                <div className="glass-card p-8 md:p-12 overflow-hidden">
                    {/* Flow Visualization */}
                    <div className="flex flex-col gap-0 items-center">
                        {/* Entry Point */}
                        <div className="w-full max-w-md glass-card p-5 text-center border-[rgba(91,163,245,0.2)]">
                            <div className="flex items-center justify-center gap-3 mb-2">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent-blue)" strokeWidth="1.5">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                    <polyline points="7 10 12 15 17 10" />
                                    <line x1="12" y1="15" x2="12" y2="3" />
                                </svg>
                                <span className="heading-md text-[var(--text-primary)]">Incoming Request</span>
                            </div>
                            <span className="text-xs text-[var(--text-muted)] font-mono">
                                identity • target_object • endpoint • tenant
                            </span>
                        </div>

                        {/* Arrow */}
                        <div className="w-px h-10 bg-gradient-to-b from-[var(--accent-blue)] to-transparent opacity-40" />

                        {/* Security Engines Row */}
                        <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-4">
                            {[
                                {
                                    title: "Intent Graph",
                                    subtitle: "graph_risk_score",
                                    color: "#2d6bcf",
                                    items: ["Novel access detection", "Fan-out scoring", "Cross-tenant blast", "Edge decay & pruning"],
                                },
                                {
                                    title: "Sequence Scorer",
                                    subtitle: "sequence_risk_score",
                                    color: "#1a8a7a",
                                    items: ["Enum→read→export chains", "Credential probing", "Scope violations", "Timing metrics"],
                                },
                                {
                                    title: "Trust Engine",
                                    subtitle: "trust_score [0–100]",
                                    color: "#5ba3f5",
                                    items: ["EWMA smoothing", "Warm-up protection", "Hysteresis logic", "Verdict mapping"],
                                },
                            ].map((engine) => (
                                <div
                                    key={engine.title}
                                    className="glass-card p-5 flex flex-col gap-3"
                                    style={{
                                        borderColor: `color-mix(in srgb, ${engine.color} 25%, transparent)`,
                                    }}
                                >
                                    <div className="flex items-center gap-2 mb-1">
                                        <div
                                            className="w-2 h-2 rounded-full"
                                            style={{ background: engine.color }}
                                        />
                                        <span className="text-sm font-semibold text-[var(--text-primary)]">
                                            {engine.title}
                                        </span>
                                    </div>
                                    <code
                                        className="text-[10px] font-mono px-2 py-1 rounded w-fit"
                                        style={{
                                            color: engine.color,
                                            background: `color-mix(in srgb, ${engine.color} 8%, transparent)`,
                                        }}
                                    >
                                        {engine.subtitle}
                                    </code>
                                    <ul className="flex flex-col gap-1.5 mt-1">
                                        {engine.items.map((item) => (
                                            <li
                                                key={item}
                                                className="text-xs text-[var(--text-secondary)] flex items-start gap-2"
                                            >
                                                <span className="text-[var(--text-muted)] mt-0.5">›</span>
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>

                        {/* Arrow */}
                        <div className="w-px h-10 bg-gradient-to-b from-transparent via-[var(--accent-teal)] to-transparent opacity-40" />

                        {/* Decision Output */}
                        <div className="w-full max-w-lg glass-card p-5">
                            <div className="text-center mb-4">
                                <span className="heading-md text-[var(--text-primary)]">Policy Decision</span>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                {[
                                    { label: "ALLOW", color: "var(--success)", desc: "Trust > 60" },
                                    { label: "STEP UP", color: "var(--warning)", desc: "Trust 30–60" },
                                    { label: "BLOCK", color: "var(--danger)", desc: "Trust < 30" },
                                ].map((decision) => (
                                    <div
                                        key={decision.label}
                                        className="rounded-xl p-3 text-center"
                                        style={{
                                            background: `color-mix(in srgb, ${decision.color} 8%, transparent)`,
                                            border: `1px solid color-mix(in srgb, ${decision.color} 20%, transparent)`,
                                        }}
                                    >
                                        <div
                                            className="text-sm font-bold font-mono mb-1"
                                            style={{ color: decision.color }}
                                        >
                                            {decision.label}
                                        </div>
                                        <div className="text-[10px] text-[var(--text-muted)]">
                                            {decision.desc}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-4 pt-4 border-t border-[var(--border-subtle)] text-center">
                                <span className="text-xs text-[var(--text-muted)] font-mono">
                                    + Risk Card • Evidence Chain • Timing Metrics
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
