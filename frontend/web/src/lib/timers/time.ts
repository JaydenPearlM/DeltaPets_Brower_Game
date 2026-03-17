// Returns milliseconds remaining until a timestamp
export function msUntil(ts: string | number | Date | null | undefined) {
  if (!ts) return 0;

  const target = ts instanceof Date ? ts.getTime() : new Date(ts).getTime();

  if (!Number.isFinite(target)) return 0;

  return Math.max(0, target - Date.now());
}

// Formats remaining time like 2:00 or 1:59
export function formatDuration(ms: number | null | undefined) {
  if (ms == null || !Number.isFinite(ms) || ms <= 0) return "0:00";

  // Use ceil so timer visually starts at 2:00 instead of 1:59
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));

  const seconds = totalSeconds % 60;
  const minutes = Math.floor(totalSeconds / 60) % 60;
  const hours = Math.floor(totalSeconds / 3600);

  const pad = (n: number) => String(n).padStart(2, "0");

  if (hours > 0) {
    return `${hours}:${pad(minutes)}:${pad(seconds)}`;
  }

  return `${minutes}:${pad(seconds)}`;
}
