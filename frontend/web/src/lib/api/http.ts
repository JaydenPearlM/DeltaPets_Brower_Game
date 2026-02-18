// src/lib/api/http.ts
// Compatibility wrapper: keep old imports working while we standardize on baseClient.ts

import { apiFetch, getAuthHeaders } from "./baseClient";

export async function apiJson<T>(
  path: string,
  init: RequestInit & { json?: any } = {},
) {
  return apiFetch<T>(path, init);
}

// Raw Response helper (rarely needed). Still attaches auth.
// Prefer apiFetch/apiJson unless you truly need Response.
export async function api(path: string, init: RequestInit = {}) {
  const url = path.startsWith("/") ? path : `/${path}`;
  const headers = await getAuthHeaders(init.headers);

  return fetch(url, {
    ...init,
    headers,
    credentials: "include",
  });
}
