import { supabase } from "../../supabase/client";

// frontend/web/src/lib/api/client.ts
// Single fetch wrapper for ALL gameplay API calls.
// Supabase is used ONLY for auth/session token retrieval.

export class ApiError extends Error {
  status: number;
  payload: any;

  constructor(message: string, status: number, payload?: any) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

async function getAccessToken(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error(error.message);

  const token = data.session?.access_token;
  if (!token) throw new Error("Missing access token. Are you logged in?");
  return token;
}

export async function getAuthHeaders(
  extra?: HeadersInit,
): Promise<HeadersInit> {
  const token = await getAccessToken();
  return {
    Authorization: `Bearer ${token}`,
    ...(extra ?? {}),
  };
}

async function parseMaybeJson(res: Response) {
  const ct = res.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) {
    try {
      return await res.json();
    } catch {
      return null;
    }
  }

  const text = await res.text().catch(() => "");
  return text || null;
}

/**
 * apiFetch
 * - calls your backend via the Vite proxy (/api -> http://localhost:4000)
 * - auto-attaches Bearer token
 * - supports init.json for JSON request bodies
 * - throws ApiError with status + payload on non-2xx
 */
export async function apiFetch<T>(
  path: string,
  init?: RequestInit & { json?: any },
): Promise<T> {
  const headers = await getAuthHeaders({
    ...(init?.headers ?? {}),
    ...(init?.json !== undefined ? { "Content-Type": "application/json" } : {}),
  });

  const res = await fetch(path, {
    ...init,
    headers,
    body:
      init?.json !== undefined
        ? JSON.stringify(init.json)
        : (init?.body as any),
  });

  const payload = await parseMaybeJson(res);

  if (!res.ok) {
    const message =
      (payload && typeof payload === "object" && "error" in payload
        ? (payload as any).error
        : null) ??
      (typeof payload === "string" ? payload : null) ??
      `Request failed (${res.status})`;

    throw new ApiError(message, res.status, payload);
  }

  return payload as T;
}
