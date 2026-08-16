import { supabase } from "../supabase/client";

// Single fetch wrapper for ALL gameplay API calls.
// Supabase is used ONLY for auth/session token retrieval.

export class ApiError extends Error {
  status: number;
  payload: unknown;

  constructor(message: string, status: number, payload?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

// Shared across every apiFetch call. Without this, navigating back to a
// page that fires several requests at once (Hatchery loading its own
// data plus PetStoragePanel loading its own) means each one independently
// decides the token needs refreshing and races its own refreshSession()
// call, which is slow and can fight itself. This makes every concurrent
// caller await the same in-flight refresh instead.
let inFlightRefresh: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  if (inFlightRefresh) return inFlightRefresh;

  inFlightRefresh = (async () => {
    const { data: refreshed, error: refreshError } =
      await supabase.auth.refreshSession();

    if (refreshError || !refreshed.session) {
      throw new Error("Session expired. Please log in again.");
    }

    return refreshed.session.access_token;
  })();

  try {
    return await inFlightRefresh;
  } finally {
    inFlightRefresh = null;
  }
}

export async function getAccessToken(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw new Error(error.message);
  }

  const session = data.session;

  if (!session) {
    throw new Error("Missing access token. Are you logged in?");
  }

  const expiresAt = session.expires_at ?? 0;
  const isExpiringSoon = expiresAt * 1000 < Date.now() + 60_000;

  if (isExpiringSoon) {
    return refreshAccessToken();
  }

  return session.access_token;
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
  init?: RequestInit & { json?: unknown },
): Promise<T> {
  const doFetch = async (headers: HeadersInit) => {
    return fetch(path, {
      ...init,
      headers,
      body:
        init?.json !== undefined
          ? JSON.stringify(init.json)
          : (init?.body as BodyInit | null | undefined),
    });
  };

  let headers = await getAuthHeaders({
    ...(init?.headers ?? {}),
    ...(init?.json !== undefined ? { "Content-Type": "application/json" } : {}),
  });

  let res = await doFetch(headers);

  if (res.status === 401) {
    try {
      await refreshAccessToken();
      headers = await getAuthHeaders({
        ...(init?.headers ?? {}),
        ...(init?.json !== undefined
          ? { "Content-Type": "application/json" }
          : {}),
      });
      res = await doFetch(headers);
    } catch {
      // Session is genuinely dead, let the original failed response
      // fall through and surface as an ApiError below.
    }
  }

  const payload = await parseMaybeJson(res);

  if (!res.ok) {
    const message =
      (payload && typeof payload === "object" && "error" in payload
        ? String((payload as { error?: unknown }).error)
        : null) ??
      (typeof payload === "string" ? payload : null) ??
      `Request failed (${res.status})`;

    throw new ApiError(message, res.status, payload);
  }

  return payload as T;
}

/**
 * apiJson
 * Backwards-friendly helper:
 * - behaves like your old apiJson
 * - supports init.json if you pass it because it uses apiFetch underneath
 *
 * Example:
 *   apiJson("/api/rewards/claim", { method: "POST", json: { day: 2 } })
 */
export async function apiJson<T>(
  path: string,
  init: RequestInit & { json?: unknown } = {},
): Promise<T> {
  return apiFetch<T>(path, init);
}
