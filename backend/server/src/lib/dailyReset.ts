import { DateTime } from "luxon";

export const DEFAULT_TZ = "America/New_York";

/**
 * Returns the most recent daily reset boundary (9:00 AM local) for a given tz.
 * If it's before 9AM local time, boundary is yesterday at 9AM.
 */
export function getLocalResetBoundary(
  nowMs: number,
  tz: string,
  resetHour = 9,
) {
  const zone = tz || DEFAULT_TZ;

  const nowLocal = DateTime.fromMillis(nowMs, { zone });

  // candidate = today at 9:00 AM local
  const todayAtReset = nowLocal.set({
    hour: resetHour,
    minute: 0,
    second: 0,
    millisecond: 0,
  });

  // If it's before today's 9AM, boundary is yesterday 9AM
  const boundary =
    nowLocal < todayAtReset ? todayAtReset.minus({ days: 1 }) : todayAtReset;

  return {
    zone,
    boundaryLocal: boundary, // luxon DateTime
    boundaryIsoUtc: boundary.toUTC().toISO(), // store/compare in UTC strings
  };
}

/**
 * Next reset time (next 9AM local).
 */
export function getNextResetAt(nowMs: number, tz: string, resetHour = 9) {
  const { zone, boundaryLocal } = getLocalResetBoundary(nowMs, tz, resetHour);
  const next = boundaryLocal.plus({ days: 1 });
  return {
    zone,
    nextLocal: next,
    nextIsoUtc: next.toUTC().toISO(),
    remainingMs: Math.max(0, next.toUTC().toMillis() - nowMs),
  };
}

export function isCompletedThisCycle(
  lastCompletedAtIso: string | null,
  boundaryIsoUtc: string,
) {
  if (!lastCompletedAtIso) return false;
  const lastMs = Date.parse(lastCompletedAtIso);
  const boundaryMs = Date.parse(boundaryIsoUtc);
  if (!Number.isFinite(lastMs) || !Number.isFinite(boundaryMs)) return false;
  return lastMs >= boundaryMs;
}
