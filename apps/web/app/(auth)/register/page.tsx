"use client";
import { useState, type ChangeEvent, type FormEvent } from "react";
import { apiFetch } from "../../../lib/api";
import { useCsrfToken } from "../../../lib/api.client";

type StatusTone = "info" | "success" | "error";

const registrationEnabled =
  process.env.NEXT_PUBLIC_REGISTRATION_ENABLED === "true";

export default function RegisterPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{
    tone: StatusTone;
    message: string;
  } | null>(null);
  const { token: csrfToken, refresh: refreshCsrf } = useCsrfToken();

  const parseErrorMessage = (raw: string) => {
    if (!raw) {
      return "Registration failed. Please try again.";
    }

    try {
      const payload = JSON.parse(raw) as {
        message?: string | string[];
        error?: string;
      };
      if (Array.isArray(payload.message) && payload.message.length > 0) {
        return payload.message.join(" ");
      }
      if (typeof payload.message === "string" && payload.message) {
        return payload.message;
      }
      if (payload.error) {
        return payload.error;
      }
    } catch {
      // Fallback to plain text response.
    }

    return raw;
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = event.target;
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = form.name.trim();
    const trimmedEmail = form.email.trim();

    if (!trimmedEmail) {
      setStatus({ tone: "error", message: "Email is required." });
      return;
    }

    if (!form.password) {
      setStatus({ tone: "error", message: "Password is required." });
      return;
    }

    if (form.password.length < 8) {
      setStatus({
        tone: "error",
        message: "Password must be at least 8 characters long.",
      });
      return;
    }

    setLoading(true);
    setStatus({ tone: "info", message: "Creating your account..." });
    try {
      if (!csrfToken) {
        await refreshCsrf();
      }
      const res = await apiFetch("/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...(trimmedName ? { name: trimmedName } : {}),
          email: trimmedEmail,
          password: form.password,
        }),
      });
      if (res.ok) {
        setStatus({ tone: "success", message: "Account created successfully." });
        window.location.href = "/admin/profile";
      } else {
        const err = await res.text();
        setStatus({ tone: "error", message: parseErrorMessage(err) });
      }
    } catch (error: any) {
      setStatus({
        tone: "error",
        message: error?.message
          ? `Request failed: ${error.message}`
          : "Request failed due to an unknown error.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="auth__visual" aria-hidden="true">
        <div className="auth__visual-overlay">
          <p className="auth__tagline">Blueprint</p>
          <h2 className="auth__visual-title">
            Ready to build?
            <br />
            Let&apos;s get started.
          </h2>
          <p className="auth__visual-subtitle">
            Sign up to access the admin interface, API, and every part of the
            blueprint.
          </p>
        </div>
      </div>

      <div className="auth__panel">
        <div className="auth__panel-inner">
          <header className="auth__header">
            <p className="auth__eyebrow">Get started</p>
            <h1 className="auth__title">Create account</h1>
            <p className="auth__subtitle">
              Enter your details to start building products with Blueprint.
            </p>
          </header>

          {!registrationEnabled && (
            <p className="auth__message auth__message--info" role="status">
              Registration is disabled. Please contact your administrator.
            </p>
          )}

          {status && (
            <p
              className={`auth__message auth__message--${status.tone}`}
              role={status.tone === "error" ? "alert" : "status"}
            >
              {status.message}
            </p>
          )}

          {registrationEnabled && (
            <form className="auth__form" onSubmit={submit} noValidate>
              <div className="auth__field">
                <label className="auth__label" htmlFor="name">
                  Full name (optional)
                </label>
                <input
                  id="name"
                  name="name"
                  className="auth__input"
                  value={form.name}
                  onChange={handleChange}
                />
              </div>

              <div className="auth__field">
                <label className="auth__label" htmlFor="email">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  className="auth__input"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                />
              </div>

              <div className="auth__field">
                <label className="auth__label" htmlFor="password">
                  Password (minimum 8 characters)
                </label>
                <input
                  id="password"
                  type="password"
                  name="password"
                  className="auth__input"
                  value={form.password}
                  onChange={handleChange}
                  minLength={8}
                  autoComplete="new-password"
                  required
                />
              </div>

              <button type="submit" className="auth__submit" disabled={loading}>
                {loading ? "Submitting..." : "Create account"}
              </button>
            </form>
          )}

          <p className="auth__footer-text">
            Already have an account?{" "}
            <a className="auth__link" href="/login">
              Sign in
            </a>
          </p>
        </div>
      </div>
    </>
  );
}
