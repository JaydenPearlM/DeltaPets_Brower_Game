import { supabase } from "../../lib/supabase/client";

async function getAuthHeaders(): Promise<HeadersInit> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error(error.message);

  const token = data.session?.access_token;
  if (!token) throw new Error("Missing access token. Are you logged in?");

  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

export async function getDailyCareStatus() {
  const headers = await getAuthHeaders();

  const res = await fetch("/api/daily/care/status", {
    method: "GET",
    headers,
  });

  if (!res.ok) {
    const msg = await res.text();
    throw new Error(msg || `Daily status failed (${res.status})`);
  }

  return res.json();
}

export async function completeDailyCare() {
  const headers = await getAuthHeaders();

  const res = await fetch("/api/daily/care/complete", {
    method: "POST",
    headers,
  });

  if (!res.ok) {
    const msg = await res.text();
    throw new Error(msg || `Daily complete failed (${res.status})`);
  }

  return res.json();
}
