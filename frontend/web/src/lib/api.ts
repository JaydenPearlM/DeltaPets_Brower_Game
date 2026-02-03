// frontend/web/src/lib/api.ts
import { supabase } from "./supabase/client";

/**
 * Call your Express backend routes under /api.
 * Automatically attaches Supabase access token as:
 * Authorization: Bearer <token>
 */
export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  // Grab current session token from Supabase auth
  const {
    data: { session },
    error: sessionErr,
  } = await supabase.auth.getSession();

  if (sessionErr) throw new Error(sessionErr.message);

  const token = session?.access_token ?? null;

  // Normalize to /api/<path>
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const url = `/api${cleanPath}`;

  // Merge headers safely
  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type"))
    headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(url, {
    ...init,
    headers,
  });

  if (!res.ok) {
    // Try to parse JSON error
    const contentType = res.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const body = await res.json().catch(() => null);
      const msg =
        body?.error ||
        body?.message ||
        `Request failed (${res.status} ${res.statusText})`;
      throw new Error(msg);
    }

    const text = await res.text().catch(() => "");
    throw new Error(text || `Request failed (${res.status} ${res.statusText})`);
  }

  // 204 No Content
  if (res.status === 204) return undefined as unknown as T;

  return (await res.json()) as T;
}
