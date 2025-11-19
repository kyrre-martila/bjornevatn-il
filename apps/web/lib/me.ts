import { cookies } from "next/headers";

export type UserProfile = {
  id: string;
  email: string;
  phone: string | null;
  firstName: string | null;
  lastName: string | null;
  birthDate: string | null; // ISO YYYY-MM-DD or null
  displayName: string | null;
  createdAt: string; // ISO date-time
  role: string;
};

export type MeResponse = {
  user: UserProfile;
} | null;

export async function getMe(): Promise<MeResponse> {
  const api = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
  const basePath = process.env.NEXT_PUBLIC_API_BASE_PATH ?? "/api/v1";
  const normalizedBase = basePath.endsWith("/")
    ? basePath.slice(0, -1)
    : basePath;

  const cookieHeader = cookies().toString();
  const headers: Record<string, string> = cookieHeader ? { cookie: cookieHeader } : {};

  const res = await fetch(`${api}${normalizedBase}/me`, {
    headers,
    cache: "no-store",
  });

  if (!res.ok) return null;

  const data = (await res.json()) as { user: UserProfile };
  return data ?? null;
}
