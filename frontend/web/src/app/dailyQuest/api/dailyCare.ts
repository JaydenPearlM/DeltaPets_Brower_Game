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

function nextEastern8amMs(nowMs: number) {
  const now = new Date(nowMs);

  // Convert "now" to Eastern Time using Intl
  const easternNow = new Date(
    now.toLocaleString("en-US", { timeZone: "America/New_York" }),
  );

  // Build 8:00 AM Eastern today
  const next = new Date(easternNow);
  next.setHours(8, 0, 0, 0);

  // If we've already passed 8 AM today, move to tomorrow
  if (easternNow >= next) {
    next.setDate(next.getDate() + 1);
  }

  // Convert back to real UTC timestamp
  return next.getTime();
}
