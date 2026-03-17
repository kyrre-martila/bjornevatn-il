import { redirect } from "next/navigation";
import { getMe } from "../../lib/me";
import { canManageUsers } from "../../lib/roles";
import ScannerClient from "./ScannerClient";
import "./scanner.css";

export default async function ScannerPage() {
  const me = await getMe();
  if (!canManageUsers(me?.user?.role)) {
    redirect("/access-denied");
  }

  return (
    <section className="scanner-page section">
      <div className="container container--sm">
        <ScannerClient />
      </div>
    </section>
  );
}
