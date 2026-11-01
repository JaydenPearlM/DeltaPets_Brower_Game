import { getDeltaPhaseSchedule } from "./deltaTime";

// The visible Aliune clock starts at 05:00; midnight is 19 game hours later.
export function getKennithDay(now = Date.now()) {
  const cycleMs = getDeltaPhaseSchedule().reduce((sum, phase) => sum + phase.durationMinutes, 0) * 60_000;
  const offsetMs = cycleMs * 5 / 24;
  const deltaDay = Math.floor((now + offsetMs) / cycleMs);
  return { deltaDay, serverNow: now, nextRotationAt: new Date((deltaDay + 1) * cycleMs - offsetMs).toISOString() };
}
