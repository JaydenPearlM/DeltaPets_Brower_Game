import type { ActivePetResponse } from "../types";

export async function fetchActivePet(
  apiBaseUrl: string,
  accessToken: string,
): Promise<ActivePetResponse> {
  const res = await fetch(`${apiBaseUrl}/api/pets/active`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? "Failed to fetch active pet");
  return data as ActivePetResponse;
}
