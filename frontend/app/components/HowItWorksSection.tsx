"use client";

const steps = [
    {
        number: "01",
        title: "Request Ingestion",
        description:
            "Every incoming API call, agent action, or MCP server request is captured with full context: identity, target object, endpoint, timestamp, and authentication metadata.",
        icon: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
        ),
    },
    {
        number: "02",
        title: "Graph Analysis",
        description:
            "The Intent Graph Engine builds and queries a temporal multi-relation graph, scoring novel access patterns, rapid fan-out, and cross-tenant blast radius with edge decay.",
        icon: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="6" cy="6" r="3" />
                <circle cx="18" cy="18" r="3" />
                <circle cx="18" cy="6" r="3" />
                <path d="M8.5 7.5L15.5 16.5" />
                <path d="M15 6H9" />
            </svg>
        ),
    },
    {
        number: "03",
        title: "Sequence Detection",
        description:
            "The Sequence Scorer evaluates bounded per-identity request windows, detecting enumeration chains, credential probing, and scope-contract violations against stored patterns.",
        icon: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M4 6h16" />
                <path d="M4 12h10" />
                <path d="M4 18h6" />
                <circle cx="20" cy="12" r="2" fill="currentColor" opacity="0.4" />
                <circle cx="14" cy="18" r="2" fill="currentColor" opacity="0.4" />
            </svg>
        ),
    },
    {
        number: "04",
        title: "Trust Scoring",
        description:
            "All signals merge into a continuous 0–100 trust score with EWMA smoothing, hysteresis, and warm-up protection. The score maps to a deterministic policy verdict.",
        icon: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 2L3 7v10l9 5 9-5V7l-9-5z" strokeLinejoin="round" />
                <path d="M12 22V12" />
                <path d="M3 7l9 5 9-5" />
            </svg>
        ),
    },
    {
        number: "05",
        title: "Policy Decision",
        description:
            "SENTRA emits one of three verdicts — allow, step-up, or block — with a structured Risk Card containing full evidence, scoring rationale, and timing metrics.",
        icon: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M9 12l2 2 4-4" />
                <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
            </svg>
        ),
    },
];

export default function HowItWorksSection() {
    return (
        <section id="how-it-works" className="relative py-28 px-6">
            {/* Subtle section glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[1px] bg-gradient-to-r from-transparent via-[var(--accent-blue)] to-transparent opacity-30" />

            <div className="max-w-5xl mx-auto">
                {/* Section Header */}
                <div className="text-center mb-20">
                    <span className="inline-block text-xs font-semibold tracking-[0.25em] text-[var(--accent-teal)] uppercase mb-4">
                        Pipeline
                    </span>
                    <h2 className="heading-lg text-[var(--text-primary)] mb-4">
                        How{" "}
                        <span className="text-gradient-teal">SENTRA</span>{" "}
                        Works
                    </h2>
                    <p className="text-[var(--text-secondary)] max-w-xl mx-auto leading-relaxed">
                        From request ingestion to policy decision — every step is transparent, deterministic, and auditable.
                    </p>
                </div>

                {/* Steps */}
                <div className="relative">
                    {/* Connecting Line */}
                    <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-[var(--accent-blue)] via-[var(--accent-teal)] to-transparent opacity-20" />

                    <div className="flex flex-col gap-16">
                        {steps.map((step, i) => (
                            <div
                                key={step.number}
                                className={`relative flex flex-col md:flex-row items-start gap-8 ${i % 2 === 1 ? "md:flex-row-reverse" : ""
                                    }`}
                            >
                                {/* Timeline Node */}
                                <div className="absolute left-8 md:left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-[var(--bg-primary)] border-2 border-[var(--accent-blue)] z-10">
                                    <div className="absolute inset-0 rounded-full bg-[var(--accent-blue)] opacity-30 animate-ping" style={{ animationDuration: "3s" }} />
                                </div>

                                {/* Content Card */}
                                <div
                                    className={`glass-card p-7 ml-16 md:ml-0 md:w-[calc(50%-40px)] ${i % 2 === 0 ? "md:mr-auto" : "md:ml-auto"
                                        }`}
                                >
                                    <div className="flex items-start gap-4 mb-4">
                                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[var(--accent-blue)] to-[var(--accent-teal)] flex items-center justify-center text-white/80 shrink-0">
                                            {step.icon}
                                        </div>
                                        <div>
                                            <span className="text-xs font-mono text-[var(--accent-blue)] tracking-widest">
                                                STEP {step.number}
                                            </span>
                                            <h3 className="heading-md text-[var(--text-primary)] mt-1">
                                                {step.title}
                                            </h3>
                                        </div>
                                    </div>
                                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                                        {step.description}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
