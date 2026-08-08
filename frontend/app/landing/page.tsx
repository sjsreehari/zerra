export default function LandingPage() {
  return (
    <main className="hero">
      <div className="hero-panels" aria-hidden="true" />
      <div className="hero-noise" aria-hidden="true" />

      <nav className="nav" aria-label="Primary navigation">
        <a href="#home">Home</a>
        <a href="#why-zerra">Why Zerra</a>
        <a href="#blog">Blog</a>
        <a href="#about">About</a>
        <a href="/login" className="text-sm text-blue-400 font-medium hover:underline ml-auto">Console</a>
      </nav>

      <section className="hero-content" id="home">
        <h1>Authorisation<br />That Understands Intent</h1>
        <p>Protect AI agents, users, and services with identity-aware authorization that understands behavior, not just requests.</p>
        <div className="flex items-center gap-4 flex-wrap">
          <a className="access-button" href="mailto:hello@zerra.dev">
            <span>Get Early Access</span>
            <span className="arrow" aria-hidden="true">↗</span>
          </a>
          <a className="dashboard-button" href="/dashboard">
            <span>Open Dashboard</span>
            <span className="arrow" aria-hidden="true">→</span>
          </a>
        </div>
      </section>

      <p className="principles">Identity-aware <span>•</span> Sequence-aware <span>•</span> Explainable by Design</p>
    </main>
  );
}
