import { useEffect, useMemo, useRef, useState } from "react";

// Server says: "remaining_ms at server_now".
// Client shows a smooth countdown by subtracting elapsed time since fetch.
// No client clock trust required.
export function useServerCountdown(params: {
  serverNowIso: string | null | undefined;
  remainingMs: number | null | undefined;
  tickMs?: number; // UI update rate
}) {
  const { serverNowIso, remainingMs, tickMs = 250 } = params;

  const baseRemainingRef = useRef<number>(0);
  const basePerfRef = useRef<number>(0);

  const [displayMs, setDisplayMs] = useState(0);

  // When server updates arrive, reset the baseline.
  useEffect(() => {
    const r =
      typeof remainingMs === "number" && Number.isFinite(remainingMs)
        ? remainingMs
        : 0;
    baseRemainingRef.current = Math.max(0, Math.floor(r));
    basePerfRef.current = performance.now();
    setDisplayMs(baseRemainingRef.current);
  }, [serverNowIso, remainingMs]);

  // Smooth ticking countdown (client only animates; server is truth).
  useEffect(() => {
    const id = window.setInterval(() => {
      const elapsed = performance.now() - basePerfRef.current;
      const next = Math.max(0, baseRemainingRef.current - elapsed);
      setDisplayMs(Math.floor(next));
    }, tickMs);

    return () => window.clearInterval(id);
  }, [tickMs]);

  return useMemo(() => {
    const msLeft = Math.max(0, displayMs);
    return { msLeft, isReady: msLeft <= 0 };
  }, [displayMs]);
}
