"use client";

import { FormEvent, useState } from "react";

export default function LoginPage() {
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
  }

  return (
    <main className="login-page">
      <div className="login-glow" aria-hidden="true" />
      <div className="login-grid" aria-hidden="true" />
      <div className="login-grain" aria-hidden="true" />

      <section className="login-card" aria-labelledby="login-heading">
        <h1 id="login-heading">Login</h1>
        <form onSubmit={handleSubmit}>
          <label className="login-field">
            <span>Username</span>
            <input name="username" type="text" autoComplete="username" required />
          </label>
          <label className="login-field">
            <span>Password</span>
            <input name="password" type="password" autoComplete="current-password" required />
          </label>

          <div className="login-options">
            <label className="remember-option"><input type="checkbox" name="remember" /> <span>Remember me</span></label>
            <a href="#forgot-password">Forgot Password?</a>
          </div>

          <button className="primary-login" type="submit">Login</button>
          <div className="or-divider" aria-label="or"><span>Or</span></div>
          <button className="google-login" type="button" onClick={() => window.location.assign("/api/auth/google")}>
            <span className="google-mark" aria-hidden="true">G</span>
            <span>Sign in with Google</span>
          </button>
          <p className="register-copy">Don&apos;t have an Account? <a href="#register">Register Now</a></p>
          {submitted && <p className="login-status" role="status">Login submitted</p>}
        </form>
      </section>
    </main>
  );
}
