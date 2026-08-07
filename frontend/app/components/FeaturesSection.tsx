"use client";

const features = [
    {
        icon: (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                <path d="M2 12h20" />
            </svg>
        ),
        title: "Intent Graph Engine",
        description:
            "Temporal multi-relation graph tracks identity-to-object, identity-to-endpoint, and object-to-tenant relationships. Detects novel access, rapid fan-out, and cross-tenant blast radius.",
        gradient: "from-[#2d6bcf] to-[#1e4fa0]",
        metric: "graph_risk_score",
        range: "0 – 1",
    },
    {
        icon: (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M4 6h16M4 12h16M4 18h16" />
                <circle cx="8" cy="6" r="2" fill="currentColor" opacity="0.3" />
                <circle cx="16" cy="12" r="2" fill="currentColor" opacity="0.3" />
                <circle cx="10" cy="18" r="2" fill="currentColor" opacity="0.3" />
            </svg>
        ),
        title: "Sequence Scorer",
        description:
            "Bounded per-identity request windows detect enumerate→read→export chains, credential probing via 401/403 patterns, and agent/MCP scope-contract violations in real-time.",
        gradient: "from-[#1a8a7a] to-[#14665a]",
        metric: "sequence_risk_score",
        range: "0 – 1",
    },
    {
        icon: (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 2L3 7v10l9 5 9-5V7l-9-5z" strokeLinejoin="round" />
                <path d="M12 22V12" />
                <path d="M3 7l9 5 9-5" />
                <circle cx="12" cy="12" r="3" fill="currentColor" opacity="0.2" />
            </svg>
        ),
        title: "Trust Score Engine",
        description:
            "EWMA-smoothed continuous 0–100 score combining graph risk, sequence risk, authentication weakness, and sensitive-field exposure. Maps to allow, step-up, or block verdicts.",
        gradient: "from-[#5ba3f5] to-[#3eccb8]",
        metric: "trust_score",
        range: "0 – 100",
    },
    {
        icon: (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="3" />
                <path d="M3 9h18" />
                <path d="M9 3v18" />
                <circle cx="15" cy="15" r="2" fill="currentColor" opacity="0.3" />
            </svg>
        ),
        title: "Risk Card System",
        description:
            "Each blocked or stepped-up request generates a Risk Card with full evidence chain: triggering pattern, feature evidence, timing metrics, and transparent scoring rationale.",
        gradient: "from-[#e74c5a] to-[#c43545]",
        metric: "risk_cards",
        range: "per event",
    },
    {
        icon: (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <path d="M16 13H8" />
                <path d="M16 17H8" />
                <polyline points="10 9 9 9 8 9" />
            </svg>
        ),
        title: "Policy Engine",
        description:
            "Structured policy decisions with hysteresis and warm-up protection. Transparent, deterministic scoring designed as a foundation for later GraphSAGE/GAT models.",
        gradient: "from-[#d4a23e] to-[#b08830]",
        metric: "policy_decision",
        range: "allow | step_up | block",
    },
    {
        icon: (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
                <path d="M9 12l2 2 4-4" />
            </svg>
        ),
        title: "Agent Firewall",
        description:
            "Kill-switch and scope enforcement for AI agents and MCP servers. Monitors and gates agent behavior, preventing scope violations and unauthorized data access patterns.",
        gradient: "from-[#2ec47a] to-[#22a865]",
        metric: "agent_status",
        range: "active | throttled | killed",
    },
];

export default function FeaturesSection() {
    return (
        <section id="features" className="relative py-28 px-6">
            <div className="max-w-7xl mx-auto">
                {/* Section Header */}
                <div className="text-center mb-16">
                    <span className="inline-block text-xs font-semibold tracking-[0.25em] text-[var(--accent-blue)] uppercase mb-4">
                        Security Modules
                    </span>
                    <h2 className="heading-lg text-[var(--text-primary)] mb-4">
                        Multi-Layered{" "}
                        <span className="text-gradient-blue">Defense</span>
                    </h2>
                    <p className="text-[var(--text-secondary)] max-w-xl mx-auto leading-relaxed">
                        Three deterministic scoring engines work in concert, generating transparent evidence for every security decision.
                    </p>
                </div>

                {/* Feature Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {features.map((feature, i) => (
                        <div
                            key={feature.title}
                            className={`glass-card card-shine p-7 flex flex-col gap-5 animate-fade-in-up stagger-${i + 1}`}
                        >
                            {/* Icon */}
                            <div
                                className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center text-white/90`}
                            >
                                {feature.icon}
                            </div>

                            {/* Title */}
                            <h3 className="heading-md text-[var(--text-primary)]">
                                {feature.title}
                            </h3>

                            {/* Description */}
                            <p className="text-sm text-[var(--text-secondary)] leading-relaxed flex-1">
                                {feature.description}
                            </p>

                            {/* Metric Footer */}
                            <div className="flex items-center justify-between pt-4 border-t border-[var(--border-subtle)]">
                                <code className="text-xs text-[var(--text-accent)] font-mono bg-[rgba(91,163,245,0.06)] px-2 py-1 rounded">
                                    {feature.metric}
                                </code>
                                <span className="text-xs text-[var(--text-muted)]">
                                    {feature.range}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
