import type { ReactNode } from "react";

export const dynamic = "force-dynamic";

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
