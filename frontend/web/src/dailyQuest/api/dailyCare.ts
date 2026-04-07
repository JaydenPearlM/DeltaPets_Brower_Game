// src/dailyQuest/api/dailyCare.ts

import { apiFetch } from "../../lib/api/baseClient";

/**
 * Fetch current daily care status
 */
export async function getDailyCareStatus() {
  return apiFetch("/api/daily/care/status", {
    method: "GET",
  });
}

/**
 * Complete daily care action
 */
export async function completeDailyCare() {
  return apiFetch("/api/daily/care/complete", {
    method: "POST",
  });
}

/**
 * Calculates next 8:00 AM Eastern Time reset (client-side helper only)
 */
export function nextEastern8amMs(nowMs: number) {
  const now = new Date(nowMs);

  // Convert to Eastern time
  const easternNow = new Date(
    now.toLocaleString("en-US", { timeZone: "America/New_York" }),
  );

  const next = new Date(easternNow);
  next.setHours(8, 0, 0, 0);

  // If already past 8 AM, move to tomorrow
  if (easternNow >= next) {
    next.setDate(next.getDate() + 1);
  }

  return next.getTime();
}
