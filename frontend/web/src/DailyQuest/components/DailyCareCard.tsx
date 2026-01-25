import { useEffect, useMemo, useState } from "react";
import { completeDailyCare, getDailyCareStatus } from "../api/dailyCare";
import { formatDuration, useServerCountdown } from "../../features/auth/Timers";

type DailyCareStatus = {
  available: boolean;
  completed_today?: boolean;
  next_reset_at?: string; // ISO
  remaining_ms?: number;
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

  async function refresh() {
    setError(null);
    try {
      const s = (await getDailyCareStatus()) as DailyCareStatus;
      setStatus(s);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // light polling so countdown stays honest even if tab sleeps
    const id = window.setInterval(refresh, 30_000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { msLeft, isReady } = useServerCountdown({
    serverNowIso: status?.server_now,
    remainingMs: status?.remaining_ms,
    tickMs: 1000,
  });

  const prettyLeft = useMemo(() => formatDuration(msLeft), [msLeft]);

  async function doDaily() {
    setToast(null);
    setError(null);
    setBusy(true);
    try {
      const res: any = await completeDailyCare();
      setToast(res?.ribbon_awarded ? "Ribbon earned!" : "Daily completed!");
      await refresh();
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

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
            {loading
              ? "Loading…"
              : status?.available
                ? "Available now."
                : isReady
                  ? "Available now."
                  : `Next in ${prettyLeft}`}
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center" }}>
          <button
            type="button"
            onClick={doDaily}
            disabled={busy || loading || !(status?.available ?? isReady)}
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
          <strong>Ribbon:</strong> {status?.alpha_ribbon_awarded ? "Yes" : "No"}
        </span>
      </div>

      {toast ? <p style={{ margin: "10px 0 0" }}>{toast}</p> : null}
      {error ? (
        <p style={{ margin: "10px 0 0", color: "crimson" }}>{error}</p>
      ) : null}
    </div>
  );
}
