import "@org/ui-tokens/index.css";
import "./globals.css";

import type { ReactNode } from "react";

export const metadata = {
  title: "Blueprint App",
  description: "Fullstack blueprint",
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en">
      <body className="app-root">{children}</body>
    </html>
  );
}
