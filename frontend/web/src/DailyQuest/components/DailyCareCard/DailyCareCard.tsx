import { useEffect, useMemo, useRef, useState } from "react";
import { completeDailyCare, getDailyCareStatus } from "../../api/dailyCare";
import { formatDuration, useNow } from "@/lib/timers";

type DailyCareStatus = {
  available: boolean;
  completed_today?: boolean;

  // server-provided timing
  next_reset_at?: string; // ISO (optional)
  remaining_ms?: number; // number (preferred)
  server_now?: string; // ISO

  streak?: number;
  alpha_ribbon_awarded?: boolean;
};

export function DailyCareCard() {
  const [status, setStatus] = useState<DailyCareStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // We store when the status was fetched so remaining_ms can tick down locally
  const fetchedAtMsRef = useRef<number>(Date.now());

  async function refresh() {
    setError(null);
    try {
      const s = (await getDailyCareStatus()) as DailyCareStatus;
      setStatus(s);
      fetchedAtMsRef.current = Date.now();
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // light polling so the server stays the source of truth
    const id = window.setInterval(refresh, 30_000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // tick every second for UI countdown
  const nowMs = useNow(1000);

  // Compute msLeft safely.
  // Priority:
  // 1) Use server remaining_ms (best) and tick it down locally
  // 2) Else derive from next_reset_at - server_now (fallback)
  const msLeft = useMemo(() => {
    const s = status;

    // 1) preferred: server sends remaining_ms
    if (
      typeof s?.remaining_ms === "number" &&
      Number.isFinite(s.remaining_ms)
    ) {
      const elapsed = Math.max(0, nowMs - fetchedAtMsRef.current);
      return Math.max(0, s.remaining_ms - elapsed);
    }

    // 2) fallback: derive from ISO timestamps
    const nextResetMs = s?.next_reset_at ? Date.parse(s.next_reset_at) : NaN;
    const serverNowMs = s?.server_now ? Date.parse(s.server_now) : NaN;

    if (!Number.isFinite(nextResetMs) || !Number.isFinite(serverNowMs))
      return 0;

    const base = Math.max(0, nextResetMs - serverNowMs);
    const elapsed = Math.max(0, nowMs - fetchedAtMsRef.current);
    return Math.max(0, base - elapsed);
  }, [status, nowMs]);

  const prettyLeft = useMemo(() => formatDuration(msLeft), [msLeft]);

  const isReady = useMemo(() => {
    // If server says available, trust it.
    if (status?.available) return true;
    // If we have no time left, it should be ready.
    return msLeft <= 0;
  }, [status?.available, msLeft]);

  async function doDaily() {
    setToast(null);
    setError(null);
    setBusy(true);

    try {
      const result: any = await completeDailyCare();
      await refresh();

      const lines = ["Daily Complete."];
      if (result?.ribbon_awarded_now) lines.push("Alpha Ribbon Awarded!");

      setToast(lines.join("\n"));
    } catch (e: any) {
      const msg = e?.message ?? String(e);

      // If it's the "already completed today" case, that's not an error UX-wise.
      if (msg.toLowerCase().includes("already completed")) {
        await refresh();
        setToast("Daily Complete.\nAlpha Ribbon already Awarded!");
      } else {
        setError(msg);
      }
    } finally {
      setBusy(false);
    }
  }

  const canDoDaily = !!(status?.available || isReady);

  const statusText = loading
    ? "Loading…"
    : status?.completed_today
      ? `Daily Complete. Next in ${prettyLeft}`
      : status?.available || isReady
        ? "Available now."
        : `Next in ${prettyLeft}`;

  return (
    <div
      style={{
        padding: 12,
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 12,
      }}
    >
      <div
        style={{ display: "flex", justifyContent: "space-between", gap: 12 }}
      >
        <div>
          <p style={{ margin: 0, fontWeight: 800 }}>Daily Care Quest</p>
          <p style={{ margin: "6px 0 0", opacity: 0.85, fontSize: 13 }}>
            {statusText}
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center" }}>
          <button
            type="button"
            onClick={doDaily}
            disabled={busy || loading || !canDoDaily}
          >
            {busy ? "Doing…" : "Do Daily"}
          </button>
        </div>
      </div>

      <div
        style={{ marginTop: 10, display: "flex", gap: 12, flexWrap: "wrap" }}
      >
        <span style={{ opacity: 0.85, fontSize: 13 }}>
          <strong>Streak:</strong> {status?.streak ?? 0}
        </span>
        <span style={{ opacity: 0.85, fontSize: 13 }}>
          <strong>Alpha Ribbon:</strong>{" "}
          {status?.alpha_ribbon_awarded ? "Yes" : "No"}
        </span>
      </div>

      {toast ? (
        <p style={{ margin: "10px 0 0", whiteSpace: "pre-line" }}>{toast}</p>
      ) : null}

      {error ? (
        <p style={{ margin: "10px 0 0", color: "crimson" }}>{error}</p>
      ) : null}
    </div>
  );
}
