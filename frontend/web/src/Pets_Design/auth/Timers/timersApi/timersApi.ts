// frontend/web/src/Pets_Design/auth/Timers/timersApi.ts
import type { ActivePetResponse } from "../types";

/**
 * Uses RELATIVE /api/* URL so Vite proxy forwards to backend (no CORS).
 * We keep the existing signatures so callers don't break.
 *
 * NOTE:
 * - If your backend uses Authorization Bearer tokens (Supabase JWT), pass accessToken.
 * - If your backend also supports cookie auth, you can omit accessToken and set credentials: "include".
 */

type ApiErrorPayload = { error?: string; message?: string };

async function readJsonSafe(res: Response) {
  return res.json().catch(() => ({}));
}

function getErrorMessage(data: unknown, fallback: string) {
  const d = (data ?? {}) as ApiErrorPayload;
  return d.error || d.message || fallback;
}

/**
 * Fetch currently active pet (and its stats/elements payload) for this user.
 * Keeps your existing signature: (_apiBaseUrl, accessToken)
 */
export async function fetchActivePet(
  _apiBaseUrl: string,
  accessToken: string,
): Promise<ActivePetResponse> {
  const res = await fetch(`/api/pets/active`, {
    headers: accessToken
      ? { Authorization: `Bearer ${accessToken}` }
      : undefined,
    // If you rely on cookies anywhere, keep this. Otherwise harmless.
    credentials: "include",
  });

  const data = await readJsonSafe(res);

  if (!res.ok) {
    throw new Error(getErrorMessage(data, "Failed to fetch active pet"));
  }

  return data as ActivePetResponse;
}

/**
 * Get hatch timer info (whatever your backend returns from /api/pets/timer).
 * Keeping the same "pass token" pattern.
 */
export async function getHatchTimer(
  _apiBaseUrl: string,
  accessToken: string,
): Promise<any> {
  const res = await fetch(`/api/pets/timer`, {
    headers: accessToken
      ? { Authorization: `Bearer ${accessToken}` }
      : undefined,
    credentials: "include",
  });

  const data = await readJsonSafe(res);

  if (!res.ok) {
    throw new Error(getErrorMessage(data, "Failed to fetch hatch timer"));
  }

  return data;
}

/**
 * Hatch the current egg and create/activate the pet on the backend.
 * POST /api/pets/hatch
 */
export async function hatchPet(
  _apiBaseUrl: string,
  accessToken: string,
): Promise<any> {
  const res = await fetch(`/api/pets/hatch`, {
    method: "POST",
    headers: accessToken
      ? {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        }
      : { "Content-Type": "application/json" },
    credentials: "include",
    // backend doesn't need a body but sending an empty JSON keeps content-type consistent
    body: JSON.stringify({}),
  });

  const data = await readJsonSafe(res);

  if (!res.ok) {
    throw new Error(getErrorMessage(data, "Failed to hatch pet"));
  }

  return data;
}
