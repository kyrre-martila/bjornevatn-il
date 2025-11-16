"use client";
import { useState, type ChangeEvent, type FormEvent } from "react";
import { apiFetch } from "../../../lib/api";
import { useCsrfToken } from "../../../lib/api.client";

type StatusTone = "info" | "success" | "error";

export default function RegisterPage() {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    birthDate: "",
    password: "",
    acceptedTerms: false,
  });
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ tone: StatusTone; message: string } | null>(
    null,
  );
  const { token: csrfToken, refresh: refreshCsrf } = useCsrfToken();

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = event.target;
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setStatus({ tone: "info", message: "Oppretter konto …" });
    try {
      if (!csrfToken) {
        await refreshCsrf();
      }
      const res = await apiFetch("/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          birthDate: form.birthDate || undefined,
          password: form.password,
          acceptedTerms: form.acceptedTerms,
        }),
      });
      if (res.ok) {
        setStatus({ tone: "success", message: "Konto opprettet!" });
        window.location.href = "/profile";
      } else {
        const err = await res.text();
        setStatus({ tone: "error", message: `Feil: ${err}` });
      }
    } catch (error: any) {
      setStatus({ tone: "error", message: `Feil: ${error?.message ?? "Ukjent feil"}` });
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
            Klar til å bygge?
            <br />
            La oss komme i gang.
          </h2>
          <p className="auth__visual-subtitle">
            Registrer deg for å få tilgang til dashboardet, API-et og alle andre deler av
            blueprinten.
          </p>
        </div>
      </div>

      <div className="auth__panel">
        <div className="auth__panel-inner">
          <header className="auth__header">
            <p className="auth__eyebrow">Kom i gang</p>
            <h1 className="auth__title">Opprett konto</h1>
            <p className="auth__subtitle">
              Fyll inn detaljene dine og bli klar til å bygge produkter med Blueprint.
            </p>
          </header>

          {status && (
            <p
              className={`auth__message auth__message--${status.tone}`}
              role={status.tone === "error" ? "alert" : "status"}
            >
              {status.message}
            </p>
          )}

          <form className="auth__form" onSubmit={submit} noValidate>
            <div className="auth__field">
              <label className="auth__label" htmlFor="firstName">
                Fornavn
              </label>
              <input
                id="firstName"
                name="firstName"
                className="auth__input"
                value={form.firstName}
                onChange={handleChange}
                required
              />
            </div>

            <div className="auth__field">
              <label className="auth__label" htmlFor="lastName">
                Etternavn
              </label>
              <input
                id="lastName"
                name="lastName"
                className="auth__input"
                value={form.lastName}
                onChange={handleChange}
                required
              />
            </div>

            <div className="auth__field">
              <label className="auth__label" htmlFor="email">
                E-post
              </label>
              <input
                id="email"
                name="email"
                type="email"
                className="auth__input"
                value={form.email}
                onChange={handleChange}
                autoComplete="email"
                required
              />
            </div>

            <div className="auth__field">
              <label className="auth__label" htmlFor="phone">
                Telefon (valgfritt)
              </label>
              <input
                id="phone"
                name="phone"
                className="auth__input"
                value={form.phone}
                onChange={handleChange}
                autoComplete="tel"
              />
            </div>

            <div className="auth__field">
              <label className="auth__label" htmlFor="birthDate">
                Fødselsdato
              </label>
              <input
                id="birthDate"
                type="date"
                name="birthDate"
                className="auth__input"
                value={form.birthDate}
                onChange={handleChange}
              />
            </div>

            <div className="auth__field">
              <label className="auth__label" htmlFor="password">
                Passord (minst 8 tegn)
              </label>
              <input
                id="password"
                type="password"
                name="password"
                className="auth__input"
                value={form.password}
                onChange={handleChange}
                autoComplete="new-password"
                required
              />
            </div>

            <div className="auth__field auth__field--checkbox">
              <label className="auth__checkbox-label" htmlFor="acceptedTerms">
                <input
                  id="acceptedTerms"
                  type="checkbox"
                  name="acceptedTerms"
                  checked={form.acceptedTerms}
                  onChange={handleChange}
                  required
                />
                <span>Jeg godtar vilkårene for bruk</span>
              </label>
            </div>

            <button type="submit" className="auth__submit" disabled={loading}>
              {loading ? "Sender…" : "Opprett konto"}
            </button>
          </form>

          <p className="auth__footer-text">
            Har du allerede en konto?{" "}
            <a className="auth__link" href="/login">
              Logg inn
            </a>
          </p>
        </div>
      </div>
    </>
  );
}
