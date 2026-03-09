import { redirect } from "next/navigation";

export default function LegacyProfileRedirect() {
  redirect("/admin/profile");
}
