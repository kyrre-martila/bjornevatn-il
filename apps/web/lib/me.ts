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
  if (process.env.SKIP_API_DURING_BUILD?.trim().toLowerCase() === "1") {
    return null;
  }

  const cookieHeader = cookies().toString();
  const headers: Record<string, string> = cookieHeader
    ? { cookie: cookieHeader }
    : {};

  let res: Response;
  try {
    res = await fetch(`${getServerApiBaseUrl()}/me`, {
      headers,
      cache: "no-store",
    });
  } catch {
    return null;
  }

  if (!res.ok) return null;

  const data = (await res.json()) as { user: UserProfile };
  return data ?? null;
}
