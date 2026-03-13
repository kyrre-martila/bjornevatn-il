"use client";

import React, { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { login as loginRequest, AuthError } from "../../../lib/api/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError("Please enter both email and password.");
      return;
    }

    setSubmitting(true);
    try {
      await loginRequest({
        email: email.trim(),
        password,
      });

      router.push("/admin");
    } catch (err) {
      if (err instanceof AuthError) {
        setError(
          err.message || "Could not sign in. Please check your credentials.",
        );
      } else {
        setError("Could not sign in. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      {/* Visual / hero side */}
      <div className="auth__visual" aria-hidden="true">
        <div className="auth__visual-overlay">
          <p className="auth__tagline">Blueprint</p>
          <h2 className="auth__visual-title">
            Build once.
            <br />
            Deploy everywhere.
          </h2>
          <p className="auth__visual-subtitle">
            A fullstack starter that gives you a solid foundation for web, API
            and mobile — so you can focus on features and vibes.
          </p>
        </div>
      </div>

      {/* Login panel */}
      <div className="auth__panel">
        <div className="auth__panel-inner">
          <header className="auth__header">
            <p className="auth__eyebrow">Welcome back</p>
            <h1 id="login-heading" className="auth__title">
              Sign in to your account
            </h1>
            <p className="auth__subtitle">
              Continue where you left off with your fullstack blueprint.
            </p>
          </header>

          <form className="auth__form" noValidate onSubmit={handleSubmit}>
            <div className="auth__field">
              <label htmlFor="email" className="auth__label">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="auth__input"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={submitting}
              />
            </div>

            <div className="auth__field auth__field--with-link">
              <div className="auth__field-label-row">
                <label htmlFor="password" className="auth__label">
                  Password
                </label>
                <a
                  className="auth__link auth__link--muted"
                  href="/forgot-password"
                >
                  Forgot password?
                </a>
              </div>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="auth__input"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={submitting}
              />
            </div>

            {error && (
              <p className="auth__error" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              className="auth__submit"
              disabled={submitting}
            >
              {submitting ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <p className="auth__footer-text">
            Don&apos;t have an account?{" "}
            <a className="auth__link" href="/register">
              Create one
            </a>
          </p>
        </div>
      </div>
    </>
  );
}
