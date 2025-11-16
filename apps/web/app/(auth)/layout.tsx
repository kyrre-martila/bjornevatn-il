import type { ReactNode } from "react";

export default function AuthLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <section className="auth" aria-label="Authentication">
      <div className="auth__inner">{children}</div>
    </section>
  );
}
