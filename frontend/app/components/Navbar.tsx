"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const navLinks = [
    { href: "#features", label: "Features" },
    { href: "#how-it-works", label: "How It Works" },
    { href: "#dashboard-preview", label: "Dashboard" },
    { href: "#architecture", label: "Architecture" },
];

export default function Navbar() {
    const [scrolled, setScrolled] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);

    useEffect(() => {
        const handler = () => setScrolled(window.scrollY > 20);
        window.addEventListener("scroll", handler, { passive: true });
        return () => window.removeEventListener("scroll", handler);
    }, []);

    return (
        <nav
            className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? "nav-blur py-3" : "py-5 bg-transparent"
                }`}
        >
            <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-3 group">
                    <div className="relative w-9 h-9">
                        <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-[var(--accent-blue)] to-[var(--accent-teal)] opacity-80 group-hover:opacity-100 transition-opacity" />
                        <div className="absolute inset-[2px] rounded-[6px] bg-[var(--bg-primary)] flex items-center justify-center">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-[var(--accent-blue)]">
                                <path d="M12 2L3 7v10l9 5 9-5V7l-9-5z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                                <path d="M12 22V12" stroke="currentColor" strokeWidth="2" />
                                <path d="M3 7l9 5 9-5" stroke="currentColor" strokeWidth="2" />
                            </svg>
                        </div>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-sm font-bold tracking-wider text-[var(--text-primary)] uppercase">
                            SENTRA
                        </span>
                        <span className="text-[10px] tracking-[0.2em] text-[var(--text-muted)] uppercase">
                            by Zerra
                        </span>
                    </div>
                </Link>

                {/* Desktop Nav */}
                <div className="hidden md:flex items-center gap-8">
                    {navLinks.map((link) => (
                        <a
                            key={link.href}
                            href={link.href}
                            className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors duration-300 tracking-wide"
                        >
                            {link.label}
                        </a>
                    ))}
                </div>

                {/* CTA */}
                <div className="hidden md:flex items-center gap-4">
                    <a href="#dashboard-preview" className="btn-secondary text-sm py-2 px-5">
                        Live Demo
                    </a>
                    <a href="#contact" className="btn-primary text-sm py-2 px-5">
                        Get Started
                    </a>
                </div>

                {/* Mobile Toggle */}
                <button
                    id="mobile-nav-toggle"
                    className="md:hidden flex flex-col gap-1.5 p-2"
                    onClick={() => setMobileOpen(!mobileOpen)}
                    aria-label="Toggle navigation"
                >
                    <span
                        className={`block w-6 h-0.5 bg-[var(--text-secondary)] transition-all duration-300 ${mobileOpen ? "rotate-45 translate-y-2" : ""
                            }`}
                    />
                    <span
                        className={`block w-6 h-0.5 bg-[var(--text-secondary)] transition-all duration-300 ${mobileOpen ? "opacity-0" : ""
                            }`}
                    />
                    <span
                        className={`block w-6 h-0.5 bg-[var(--text-secondary)] transition-all duration-300 ${mobileOpen ? "-rotate-45 -translate-y-2" : ""
                            }`}
                    />
                </button>
            </div>

            {/* Mobile Menu */}
            {mobileOpen && (
                <div className="md:hidden nav-blur mt-2 mx-4 rounded-2xl p-6 animate-fade-in">
                    <div className="flex flex-col gap-4">
                        {navLinks.map((link) => (
                            <a
                                key={link.href}
                                href={link.href}
                                className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors py-2"
                                onClick={() => setMobileOpen(false)}
                            >
                                {link.label}
                            </a>
                        ))}
                        <div className="flex flex-col gap-3 mt-4 pt-4 border-t border-[var(--border-subtle)]">
                            <a href="#dashboard-preview" className="btn-secondary text-sm py-2 px-5 justify-center">
                                Live Demo
                            </a>
                            <a href="#contact" className="btn-primary text-sm py-2 px-5 justify-center">
                                Get Started
                            </a>
                        </div>
                    </div>
                </div>
            )}
        </nav>
    );
}
