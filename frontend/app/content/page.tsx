export default function ContentPage() {
  return (
    <main className="content-page">
      <div className="content-glow" aria-hidden="true" />
      <div className="content-grid" aria-hidden="true" />
      <div className="content-grain" aria-hidden="true" />

      <section className="content-layout" aria-labelledby="why-zerra-title">
        <h1 id="why-zerra-title">Why Zerra?</h1>

        <article className="content-card identity-card">
          <h2>Identity</h2>
          <p>The way software interacts with APIs is changing.</p>
        </article>

        <p className="content-copy identity-copy">AI agents, autonomous services, and modern applications generate millions of<br className="desktop-break" /> legitimate API requests every day. The challenge is no longer identifying invalid traffic<br className="desktop-break" />—it&apos;s understanding when valid behavior becomes dangerous.</p>

        <p className="content-copy behaviour-copy">Traditional security answers who is making a request.<br />Zerra answers whether that request should happen right now, by analyzing<br />identity, context, and behavioral patterns in real time.</p>

        <article className="content-card behaviour-card">
          <h2>Behaviour</h2>
          <p>Intent is revealed through behavior.</p>
        </article>

        <article className="content-card intelligence-card">
          <h2>Intelligence</h2>
          <p>Authorization should adapt in real time.</p>
        </article>

        <p className="content-copy intelligence-copy">As organizations adopt AI agents and autonomous systems, authorization needs to<br className="desktop-break" /> become adaptive, explainable, and intelligent. That&apos;s the future we&apos;re building.</p>
      </section>
    </main>
  );
}
