"use client";

export default function Footer() {
    return (
        <footer id="contact" className="relative pt-20 pb-10 px-6">
            {/* Top glow line */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[1px] bg-gradient-to-r from-transparent via-[var(--accent-blue)] to-transparent opacity-20" />

            <div className="max-w-7xl mx-auto">
                {/* CTA Banner */}
                <div className="glass-card glow-blue p-10 md:p-14 text-center mb-20 relative overflow-hidden">
                    <div className="grid-overlay" />
                    <div className="relative z-10">
                        <h2 className="heading-lg text-[var(--text-primary)] mb-4">
                            Ready to Secure Your{" "}
                            <span className="text-gradient-mixed">Infrastructure</span>?
                        </h2>
                        <p className="text-[var(--text-secondary)] max-w-lg mx-auto mb-8 leading-relaxed">
                            Deploy SENTRA in front of your APIs, AI agents, and MCP servers. Start with the security core and expand to full dashboard monitoring.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <a
                                href="https://github.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn-primary text-base py-3.5 px-8"
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
                                </svg>
                                View on GitHub
                            </a>
                            <a href="#features" className="btn-secondary text-base py-3.5 px-8">
                                Learn More
                            </a>
                        </div>
                    </div>
                </div>

                {/* Footer Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-14">
                    {/* Brand */}
                    <div className="col-span-2 md:col-span-1">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="relative w-8 h-8">
                                <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-[var(--accent-blue)] to-[var(--accent-teal)] opacity-80" />
                                <div className="absolute inset-[2px] rounded-[5px] bg-[var(--bg-primary)] flex items-center justify-center">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-[var(--accent-blue)]">
                                        <path d="M12 2L3 7v10l9 5 9-5V7l-9-5z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                                    </svg>
                                </div>
                            </div>
                            <div>
                                <span className="text-sm font-bold tracking-wider text-[var(--text-primary)]">
                                    SENTRA
                                </span>
                            </div>
                        </div>
                        <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                            Zero-trust authorization layer for APIs, services, AI agents, and MCP servers.
                        </p>
                    </div>

                    {/* Links */}
                    {[
                        {
                            title: "Product",
                            links: ["Features", "Dashboard", "Architecture", "Pricing"],
                        },
                        {
                            title: "Developers",
                            links: ["Documentation", "API Reference", "Python SDK", "Go SDK"],
                        },
                        {
                            title: "Company",
                            links: ["About Zerra", "Blog", "Security", "Contact"],
                        },
                    ].map((col) => (
                        <div key={col.title}>
                            <h4 className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider mb-4">
                                {col.title}
                            </h4>
                            <ul className="flex flex-col gap-2.5">
                                {col.links.map((link) => (
                                    <li key={link}>
                                        <a
                                            href="#"
                                            className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
                                        >
                                            {link}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                {/* Bottom Bar */}
                <div className="pt-8 border-t border-[var(--border-subtle)] flex flex-col md:flex-row items-center justify-between gap-4">
                    <span className="text-xs text-[var(--text-muted)]">
                        © 2026 Zerra. All rights reserved.
                    </span>
                    <div className="flex items-center gap-6">
                        <a href="#" className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors">
                            Privacy Policy
                        </a>
                        <a href="#" className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors">
                            Terms of Service
                        </a>
                        <a href="#" className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors">
                            Status
                        </a>
                    </div>
                </div>
            </div>
        </footer>
    );
}
