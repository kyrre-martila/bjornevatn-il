import { cookies } from "next/headers";
import { getServerApiBaseUrl } from "./api-config";

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
  const cookieHeader = cookies().toString();
  const headers: Record<string, string> = cookieHeader
    ? { cookie: cookieHeader }
    : {};

  const res = await fetch(`${getServerApiBaseUrl()}/me`, {
    headers,
    cache: "no-store",
  });

  if (!res.ok) return null;

  const data = (await res.json()) as { user: UserProfile };
  return data ?? null;
}
