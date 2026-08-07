"use client";

import { useEffect, useRef } from "react";

export default function HeroSection() {
    const heroRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!heroRef.current) return;
            const rect = heroRef.current.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;
            heroRef.current.style.setProperty("--mouse-x", `${x}%`);
            heroRef.current.style.setProperty("--mouse-y", `${y}%`);
        };
        const el = heroRef.current;
        el?.addEventListener("mousemove", handleMouseMove);
        return () => el?.removeEventListener("mousemove", handleMouseMove);
    }, []);

    return (
        <section
            ref={heroRef}
            id="hero"
            className="relative min-h-screen flex items-center justify-center overflow-hidden"
            style={{
                background: `radial-gradient(
          600px circle at var(--mouse-x, 50%) var(--mouse-y, 50%),
          rgba(45, 107, 207, 0.06),
          transparent 60%
        )`,
            }}
        >
            {/* Grid Overlay */}
            <div className="grid-overlay" />

            {/* Content */}
            <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
                {/* Status Pill */}
                <div className="animate-fade-in-up stagger-1 inline-flex items-center gap-2 mb-8 px-5 py-2 rounded-full border border-[var(--border-subtle)] bg-[rgba(10,14,25,0.5)] backdrop-blur-md">
                    <span className="pulse-dot bg-[var(--success)]" />
                    <span className="text-xs font-medium tracking-wider text-[var(--text-secondary)] uppercase">
                        Security engines active — v1.0
                    </span>
                </div>

                {/* Main Headline */}
                <h1 className="animate-fade-in-up stagger-2 heading-xl mb-6">
                    <span className="text-[var(--text-primary)]">Zero-Trust </span>
                    <span className="text-gradient-blue">Intelligence</span>
                    <br />
                    <span className="text-[var(--text-primary)]">for Every </span>
                    <span className="text-gradient-teal">Request</span>
                </h1>

                {/* Subheadline */}
                <p className="animate-fade-in-up stagger-3 text-lg md:text-xl text-[var(--text-secondary)] max-w-2xl mx-auto mb-10 leading-relaxed">
                    SENTRA evaluates identity, intent, and behavioral sequences in real-time — deciding
                    whether to <span className="text-[var(--success)] font-semibold">allow</span>,{" "}
                    <span className="text-[var(--warning)] font-semibold">step-up</span>, or{" "}
                    <span className="text-[var(--danger)] font-semibold">block</span> access before damage
                    is done.
                </p>

                {/* CTAs */}
                <div className="animate-fade-in-up stagger-4 flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
                    <a href="#dashboard-preview" className="btn-primary text-base py-3.5 px-8">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 2L3 7v10l9 5 9-5V7l-9-5z" strokeLinejoin="round" />
                        </svg>
                        Explore Dashboard
                    </a>
                    <a href="#how-it-works" className="btn-secondary text-base py-3.5 px-8">
                        How It Works
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M5 12h14M12 5l7 7-7 7" />
                        </svg>
                    </a>
                </div>

                {/* Stats Row */}
                <div className="animate-fade-in-up stagger-5 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
                    {[
                        { value: "<50ms", label: "Decision Latency" },
                        { value: "3", label: "Security Engines" },
                        { value: "0–100", label: "Trust Score Range" },
                        { value: "∞", label: "Scalable Agents" },
                    ].map((stat) => (
                        <div
                            key={stat.label}
                            className="glass-card p-4 flex flex-col items-center gap-1"
                        >
                            <span className="text-2xl font-bold text-gradient-mixed">
                                {stat.value}
                            </span>
                            <span className="text-xs text-[var(--text-muted)] tracking-wide uppercase">
                                {stat.label}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Bottom Gradient Fade */}
            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[var(--bg-primary)] to-transparent" />
        </section>
    );
}
