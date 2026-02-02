export function msUntil(iso: string | null | undefined, nowMs = Date.now()) {
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return 0;
  return Math.max(0, t - nowMs);
}

export function formatDuration(ms: number | null | undefined) {
  // NaN/undefined/null guard
  if (ms == null || !Number.isFinite(ms) || ms <= 0) return "0:00";

  const total = Math.max(0, Math.floor(ms / 1000));
  const s = total % 60;
  const m = Math.floor(total / 60) % 60;
  const h = Math.floor(total / 3600);

  const pad2 = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad2(m)}:${pad2(s)}` : `${m}:${pad2(s)}`;
}
