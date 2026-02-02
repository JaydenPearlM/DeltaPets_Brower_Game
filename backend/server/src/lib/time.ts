// backend/server/src/lib/time.ts
// Small, boring, correct time helpers.

export function toIso(v: any): string | null {
  if (!v) return null;
  const d = new Date(v);
  const ms = d.getTime();
  if (!Number.isFinite(ms)) return null;
  return d.toISOString();
}

export function toMsFromIso(iso: string | null): number {
  if (!iso) return NaN;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : NaN;
}

export function nowIsoFromMs(ms: number): string {
  return new Date(ms).toISOString();
}
