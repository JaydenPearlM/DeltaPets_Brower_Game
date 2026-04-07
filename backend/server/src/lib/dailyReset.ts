import { DateTime } from "luxon";

export const DEFAULT_TZ = "America/New_York";

/**
 * Game daily reset boundary (default: 9:00 AM local time).
 * We compute everything in a chosen local timezone, but we return ISO UTC strings
 * so backend + frontend can speak the same language.
 *
 * If it's before resetHour local time, the current cycle started yesterday at resetHour.
 */
export function get_local_reset_boundary(
  now_ms: number,
  tz: string = DEFAULT_TZ,
  reset_hour: number = 9,
) {
  const zone = tz || DEFAULT_TZ;

  const now_local = DateTime.fromMillis(now_ms, { zone });

  // candidate = today at resetHour local
  const today_at_reset = now_local.set({
    hour: reset_hour,
    minute: 0,
    second: 0,
    millisecond: 0,
  });

  // If it's before today's resetHour, boundary is yesterday at resetHour
  const boundary_local =
    now_local < today_at_reset
      ? today_at_reset.minus({ days: 1 })
      : today_at_reset;

  const boundary_iso_utc = boundary_local.toUTC().toISO();

  return {
    zone,
    boundary_local, // Luxon DateTime
    boundary_iso_utc, // ISO string in UTC
  };
}

/**
 * Next reset time (next resetHour local).
 * Returns snake_case keys to match backend responses like next_reset_at.
 */
export function get_next_reset_at(
  now_ms: number,
  tz: string = DEFAULT_TZ,
  reset_hour: number = 9,
) {
  const { zone, boundary_local } = get_local_reset_boundary(
    now_ms,
    tz,
    reset_hour,
  );
  const next_local = boundary_local.plus({ days: 1 });

  const next_iso_utc = next_local.toUTC().toISO();
  const remaining_ms = Math.max(0, next_local.toUTC().toMillis() - now_ms);

  return {
    zone,
    next_local, // Luxon DateTime
    next_iso_utc, // ISO UTC (this should map to next_reset_at)
    remaining_ms,
  };
}

/**
 * True if last_completed_at is within the current daily cycle (>= boundary).
 * NOTE: names are snake_case to line up with DB + API (last_completed_at).
 */
export function is_completed_this_cycle(
  last_completed_at_iso: string | null,
  boundary_iso_utc: string,
) {
  if (!last_completed_at_iso) return false;

  const last_ms = Date.parse(last_completed_at_iso);
  const boundary_ms = Date.parse(boundary_iso_utc);

  if (!Number.isFinite(last_ms) || !Number.isFinite(boundary_ms)) return false;

  return last_ms >= boundary_ms;
}
