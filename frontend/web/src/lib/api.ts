// frontend/web/src/lib/api.ts
import { supabase } from "./supabase/client";

/**
 * IMPORTANT:
 * Use RELATIVE URLs only (e.g. /api/me).
 * Vite dev server proxies /api -> http://localhost:4000
 * so the browser never talks to :4000 directly (no CORS).
 */
export async function api(path: string, init: RequestInit = {}) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  const headers = new Headers(init.headers);

  if (token) headers.set("Authorization", `Bearer ${token}`);

  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const p = path.startsWith("/") ? path : `/${path}`;
  return fetch(p, { ...init, headers });
}

export async function apiJson<T>(path: string, init: RequestInit = {}) {
  const res = await api(path, init);

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`[api] ${res.status} ${res.statusText} ${text}`);
  }

  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) return (await res.json()) as T;

  return (await res.text()) as unknown as T;
}
