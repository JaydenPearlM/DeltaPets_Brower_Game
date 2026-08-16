// backend/server/src/lib/cooldowns.ts
// Single source of truth for cooldowns.
// Safe parsing, server-computed remaining_ms, easy to consume.

export type CooldownKey = "feed" | "clean" | "play" | "bond";

export type CooldownState = {
  ends_at: string | null; // ISO
  remaining_ms: number; // server computed
  ready: boolean;
};

export type CooldownsPayload = Record<CooldownKey, CooldownState>;

const COL_BY_KEY: Record<CooldownKey, string> = {
  feed: "cd_feed_ends_at",
  clean: "cd_clean_ends_at",
  play: "cd_play_ends_at",
  bond: "cd_bond_ends_at",
};

export const DEFAULT_COOLDOWN_MS: Record<CooldownKey, number> = {
  feed: 0,
  clean: 90_000,
  play: 120_000,
  bond: 75_000,
};

function toIso(v: any): string | null {
  if (!v) return null;
  const d = new Date(v);
  const ms = d.getTime();
  if (!Number.isFinite(ms)) return null;
  return d.toISOString();
}

export function cooldownsFromPetRow(pet: any, nowMs: number): CooldownsPayload {
  const mk = (key: CooldownKey): CooldownState => {
    const col = COL_BY_KEY[key];
    const endsIso = toIso(pet?.[col]);
    const endsMs = endsIso ? Date.parse(endsIso) : NaN;

    const remaining = Number.isFinite(endsMs) ? Math.max(0, endsMs - nowMs) : 0;
    const ready = remaining <= 0;

    return { ends_at: endsIso, remaining_ms: remaining, ready };
  };

  return {
    feed: mk("feed"),
    clean: mk("clean"),
    play: mk("play"),
    bond: mk("bond"),
  };
}

export function assertCooldownReady(pet: any, key: CooldownKey, nowMs: number) {
  if (key === "feed") return;

  const col = COL_BY_KEY[key];
  const endsIso = toIso(pet?.[col]);
  if (!endsIso) return;

  const endsMs = Date.parse(endsIso);
  if (!Number.isFinite(endsMs)) return;

  const remaining = endsMs - nowMs;
  if (remaining > 0) {
    const err: any = new Error(`Cooldown not ready: ${key}`);
    err.status = 409;
    err.cooldown_key = key;
    err.cooldown_ends_at = endsIso;
    err.cooldown_remaining_ms = remaining;
    throw err;
  }
}

export function calcNewCooldownEndsAtIso(
  nowMs: number,
  key: CooldownKey,
  durationMs: number = DEFAULT_COOLDOWN_MS[key],
) {
  return new Date(nowMs + durationMs).toISOString();
}

export function colNameForKey(key: CooldownKey) {
  return COL_BY_KEY[key];
}
