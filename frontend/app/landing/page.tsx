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
      </nav>

      <section className="hero-content" id="home">
        <h1>Authorisation<br />That Understands Intent</h1>
        <p>Protect AI agents, users, and services with identity-aware authorization that understands behavior, not just requests.</p>
        <a className="access-button" href="/login">
          <span>Access Console</span>
          <span className="arrow" aria-hidden="true">↗</span>
        </a>
      </section>

      <p className="principles">Identity-aware <span>•</span> Sequence-aware <span>•</span> Explainable by Design</p>
    </main>
  );
}
