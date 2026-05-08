"use client";

import { createBrowserClient } from "@supabase/ssr";

let _client: ReturnType<typeof createBrowserClient> | null = null;

export function getSupabase() {
  if (!_client) {
    _client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "placeholder"
    );
  }
  return _client;
}

export function getGuestToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("grequest_guest_token");
}

export function setGuestToken(): string {
  const token = `guest_${crypto.randomUUID()}`;
  localStorage.setItem("grequest_guest_token", token);
  return token;
}

export function clearGuestToken() {
  localStorage.removeItem("grequest_guest_token");
}

export async function getAccessToken(): Promise<string | null> {
  const guest = getGuestToken();
  if (guest) return guest;
  const sb = getSupabase();
  const { data } = await sb.auth.getSession();
  return data.session?.access_token ?? null;
}

export function isGuestSession(): boolean {
  return !!getGuestToken();
}
