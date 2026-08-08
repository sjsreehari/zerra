"use client";

import { FormEvent, useState } from "react";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export default function RegisterPage() {
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    const values = new FormData(event.currentTarget);

    try {
      const response = await fetch(`${apiBaseUrl}/api/v1/auth/register`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: values.get("name"),
          email: values.get("email"),
          password: values.get("password"),
        }),
      });
      const payload = await response.json() as { error?: string };
      if (!response.ok) {
        setError(payload.error ?? "Unable to create your account.");
        return;
      }
      window.location.assign("/dashboard");
    } catch {
      setError("The gateway is unavailable. Start the local stack and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="login-page">
      <div className="login-glow" aria-hidden="true" />
      <div className="login-grid" aria-hidden="true" />
      <div className="login-grain" aria-hidden="true" />

      <section className="login-card" aria-labelledby="register-heading">
        <h1 id="register-heading">Create account</h1>
        <form onSubmit={handleSubmit}>
          <label className="login-field">
            <span>Name</span>
            <input name="name" type="text" autoComplete="name" minLength={2} required />
          </label>
          <label className="login-field">
            <span>Email</span>
            <input name="email" type="email" autoComplete="email" required />
          </label>
          <label className="login-field">
            <span>Password</span>
            <input name="password" type="password" autoComplete="new-password" minLength={12} required />
          </label>

          <button className="primary-login" type="submit" disabled={submitting}>
            {submitting ? "Creating…" : "Create account"}
          </button>
          <p className="register-copy">Already registered? <a href="/login">Login</a></p>
          {error && <p className="form-error" role="alert">{error}</p>}
        </form>
      </section>
    </main>
  );
}
