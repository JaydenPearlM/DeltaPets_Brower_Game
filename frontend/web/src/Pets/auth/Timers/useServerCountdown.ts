import { useMemo } from "react";

export type ServerCountdownParams = {
  serverNowIso: string; // ISO string from server (ex: res.server_now)
  endsAtIso: string; // ISO string for when the timer ends (ex: hatch_ends_at)
};

function safeParseMs(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : null;
}

export type ServerCountdownResult = {
  /** true when params are present and ISO strings parse correctly */
  ready: boolean;
  /** remaining time in ms (null when not ready) */
  remainingMs: number | null;
  /** true when ready && remainingMs <= 0 */
  done: boolean;
};

/**
 * Null-safe countdown:
 * - If params is null or dates can't be parsed => { ready:false, remainingMs:null, done:false }
 * - Otherwise => { ready:true, remainingMs:<ms>, done:<boolean> }
 *
 * NOTE: This does NOT tick by itself. It's meant to compute a stable value based on
 * server_now + ends_at. If you want live ticking, wrap it with an interval in the UI.
 */
export function useServerCountdown(
  params: ServerCountdownParams | null,
): ServerCountdownResult {
  return useMemo(() => {
    if (!params) {
      return { ready: false, remainingMs: null, done: false };
    }

    const serverNowMs = safeParseMs(params.serverNowIso);
    const endsAtMs = safeParseMs(params.endsAtIso);

    if (serverNowMs == null || endsAtMs == null) {
      return { ready: false, remainingMs: null, done: false };
    }

    const remainingMs = Math.max(0, endsAtMs - serverNowMs);

    return {
      ready: true,
      remainingMs,
      done: remainingMs <= 0,
    };
  }, [params?.serverNowIso, params?.endsAtIso]);
}
