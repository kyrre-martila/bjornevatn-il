import React from 'react';

export default function LoginPage() {
  return (
    <section
      aria-labelledby="login-heading"
      className="auth auth--login"
    >
      <div className="auth__inner">
        <div className="auth__visual" aria-hidden="true">
          <div className="auth__visual-overlay">
            <p className="auth__tagline">Blueprint</p>
            <h2 className="auth__visual-title">
              Build once.<br />Deploy everywhere.
            </h2>
            <p className="auth__visual-subtitle">
              A fullstack starter that gives you a solid foundation for web, API and mobile —
              so you can focus on features and vibes.
            </p>
          </div>
        </div>

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

            <form className="auth__form" noValidate>
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
                />
              </div>

              <div className="auth__field auth__field--with-link">
                <div className="auth__field-label-row">
                  <label htmlFor="password" className="auth__label">
                    Password
                  </label>
                  <a className="auth__link auth__link--muted" href="/forgot-password">
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
                />
              </div>

              <button type="submit" className="auth__submit">
                Sign in
              </button>
            </form>

            <p className="auth__footer-text">
              Don&apos;t have an account?{' '}
              <a className="auth__link" href="/register">
                Create one
              </a>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
