import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type SignalCondition = "stable" | "unbalanced" | "unstable";
type SignalCorruption = "low" | "high";

type SignalRow = {
  id: string;
  enabled?: boolean | null;
  condition?: SignalCondition | string | null;
  region?: string | null;
  town?: string | null;
  corruption?: SignalCorruption | string | null;
  report_text?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
};

export type SignalView = {
  conditionLabel: string;
  regionLabel: string;
  townLabel: string;
  corruptionLabel: string;
  reportText: string;
  isAlert: boolean;
  bossAvailable: boolean;
};

export type UseAliuneSignalResult = {
  signal: SignalView;
};

const DEFAULT_STABLE_VIEW: SignalView = {
  conditionLabel: "Stable",
  regionLabel: "Kithna",
  townLabel: "Tutorial Island",
  corruptionLabel: "Low",
  reportText:
    "Kithna remains calm. No active instability is being reported at this time.",
  isAlert: false,
  bossAvailable: false,
};

const FALLBACK_REFRESH_MS = 60 * 1000;
const BOUNDARY_BUFFER_MS = 1500;

function formatCondition(value?: string | null): string {
  if (!value) return "Stable";

  const normalized = value.toLowerCase();

  if (normalized === "unstable") return "Unstable";
  if (normalized === "unbalanced") return "Unbalanced";

  return "Stable";
}

function formatCorruption(value?: string | null): string {
  if (!value) return "Low";

  const normalized = value.toLowerCase();

  if (normalized === "high") return "High";

  return "Low";
}

function getDelayUntilSignalExpiresMs(row: SignalRow | null): number {
  if (!row?.ends_at) return FALLBACK_REFRESH_MS;

  const endsAtMs = new Date(row.ends_at).getTime();

  if (Number.isNaN(endsAtMs)) return FALLBACK_REFRESH_MS;

  const delay = endsAtMs - Date.now() + BOUNDARY_BUFFER_MS;

  return delay > 0 ? delay : FALLBACK_REFRESH_MS;
}

function getFirstRow(data: unknown): SignalRow | null {
  if (Array.isArray(data)) {
    return (data[0] as SignalRow | undefined) ?? null;
  }

  if (data && typeof data === "object") {
    return data as SignalRow;
  }

  return null;
}

export function useAliuneSignal(): UseAliuneSignalResult {
  const [row, setRow] = useState<SignalRow | null>(null);

  useEffect(() => {
    let alive = true;
    let timeoutId: number | null = null;

    async function loadSignalAndScheduleNextRefresh() {
      const { data, error } = await supabase.rpc(
        "get_or_create_kithna_tutorial_signal",
      );

      if (!alive) return;

      if (error) {
        console.error("[aliune-signal] rpc failed", error);
        setRow(null);

        timeoutId = window.setTimeout(() => {
          void loadSignalAndScheduleNextRefresh();
        }, FALLBACK_REFRESH_MS);

        return;
      }

      const activeRow = getFirstRow(data);

      setRow(activeRow);

      timeoutId = window.setTimeout(() => {
        void loadSignalAndScheduleNextRefresh();
      }, getDelayUntilSignalExpiresMs(activeRow));
    }

    function handleVisibilityChange() {
      if (!document.hidden) {
        if (timeoutId !== null) {
          window.clearTimeout(timeoutId);
          timeoutId = null;
        }

        void loadSignalAndScheduleNextRefresh();
      }
    }

    void loadSignalAndScheduleNextRefresh();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      alive = false;

      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }

      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const signal = useMemo<SignalView>(() => {
    if (!row) {
      return DEFAULT_STABLE_VIEW;
    }

    const conditionLabel = formatCondition(row.condition);

    const regionLabel =
      typeof row.region === "string" && row.region.trim().length > 0
        ? row.region
        : "Kithna";

    const townLabel =
      typeof row.town === "string" && row.town.trim().length > 0
        ? row.town
        : "Tutorial Island";

    const corruptionLabel = formatCorruption(row.corruption);

    const reportText =
      typeof row.report_text === "string" && row.report_text.trim().length > 0
        ? row.report_text
        : DEFAULT_STABLE_VIEW.reportText;

    const bossAvailable = conditionLabel === "Unstable";

    return {
      conditionLabel,
      regionLabel,
      townLabel,
      corruptionLabel,
      reportText,
      isAlert: bossAvailable,
      bossAvailable,
    };
  }, [row]);

  return { signal };
}
