import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type SignalCondition = "stable" | "unbalanced" | "unstable";
type SignalCorruption = "none" | "low" | "rising" | "high" | "too high";

type SignalRow = {
  id: string;
  enabled?: boolean | null;
  condition?: SignalCondition | string | null;
  region?: string | null;
  corruption?: SignalCorruption | string | null;
  report_text?: string | null;
  start_time?: string | null;
  end_time?: string | null;
};

type SignalView = {
  conditionLabel: string;
  regionLabel: string;
  corruptionLabel: string;
  reportText: string;
  isAlert: boolean;
};

const DEFAULT_STABLE_VIEW: SignalView = {
  conditionLabel: "Stable",
  regionLabel: "All Regions Stable",
  corruptionLabel: "None",
  reportText:
    "Aliune remains calm. No active portal disturbances are being reported at this time.",
  isAlert: false,
};

const FALLBACK_REFRESH_MS = 60 * 60 * 1000;
const BOUNDARY_BUFFER_MS = 1500;

function formatCondition(value?: string | null): string {
  if (!value) return "Stable";

  const normalized = value.toLowerCase();

  if (normalized === "unstable") return "Unstable";
  if (normalized === "unbalanced") return "Unbalanced";
  return "Stable";
}

function formatCorruption(value?: string | null): string {
  if (!value) return "None";

  const normalized = value.toLowerCase();

  if (normalized === "too high") return "Too High";
  if (normalized === "none") return "None";

  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function parseTimeToMinutes(value?: string | null): number | null {
  if (!value) return null;

  const parts = value.split(":");
  if (parts.length < 2) return null;

  const hours = Number(parts[0]);
  const minutes = Number(parts[1]);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return null;
  }

  return hours * 60 + minutes;
}

function getCurrentLocalMinutes(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

function isActiveForDailyWindow(
  currentMinutes: number,
  startTime?: string | null,
  endTime?: string | null,
): boolean {
  const start = parseTimeToMinutes(startTime);
  const end = parseTimeToMinutes(endTime);

  if (start === null && end === null) return true;
  if (start !== null && end === null) return currentMinutes >= start;
  if (start === null && end !== null) return currentMinutes < end;
  if (start === end) return true;

  if (start !== null && end !== null && start < end) {
    return currentMinutes >= start && currentMinutes < end;
  }

  if (start !== null && end !== null) {
    return currentMinutes >= start || currentMinutes < end;
  }

  return false;
}

function getStartMinutes(row: SignalRow): number {
  return parseTimeToMinutes(row.start_time) ?? -1;
}

function pickActiveRow(
  rows: SignalRow[],
  currentMinutes: number,
): SignalRow | null {
  if (!Array.isArray(rows) || rows.length === 0) return null;

  const activeRows = rows.filter((item) =>
    isActiveForDailyWindow(currentMinutes, item.start_time, item.end_time),
  );

  if (activeRows.length === 0) return null;

  activeRows.sort((a, b) => getStartMinutes(a) - getStartMinutes(b));

  return activeRows[activeRows.length - 1] ?? null;
}

function getBoundaryMinutes(rows: SignalRow[]): number[] {
  const values = new Set<number>();

  for (const row of rows) {
    const start = parseTimeToMinutes(row.start_time);
    const end = parseTimeToMinutes(row.end_time);

    if (start !== null) values.add(start);
    if (end !== null) values.add(end);
  }

  return Array.from(values).sort((a, b) => a - b);
}

function getDelayUntilNextBoundaryMs(rows: SignalRow[]): number {
  const currentMinutes = getCurrentLocalMinutes();
  const boundaries = getBoundaryMinutes(rows);

  if (boundaries.length === 0) {
    return FALLBACK_REFRESH_MS;
  }

  for (const boundary of boundaries) {
    if (boundary > currentMinutes) {
      const diffMinutes = boundary - currentMinutes;
      return diffMinutes * 60 * 1000 + BOUNDARY_BUFFER_MS;
    }
  }

  const firstBoundaryTomorrow = boundaries[0];
  const diffMinutes = 24 * 60 - currentMinutes + firstBoundaryTomorrow;

  return diffMinutes * 60 * 1000 + BOUNDARY_BUFFER_MS;
}

export function useAliuneSignal() {
  const [row, setRow] = useState<SignalRow | null>(null);

  useEffect(() => {
    let alive = true;
    let timeoutId: number | null = null;

    async function loadSignalAndScheduleNextRefresh() {
      const { data, error } = await supabase
        .from("aliune_signal_reports")
        .select(
          "id, enabled, condition, region, corruption, report_text, start_time, end_time",
        )
        .eq("enabled", true)
        .order("start_time", { ascending: true });

      if (!alive) return;

      if (error) {
        console.error("[aliune-signal] fetch failed", error);
        setRow(null);

        timeoutId = window.setTimeout(() => {
          void loadSignalAndScheduleNextRefresh();
        }, FALLBACK_REFRESH_MS);

        return;
      }

      const rows: SignalRow[] = Array.isArray(data) ? data : [];
      const currentMinutes = getCurrentLocalMinutes();
      const activeRow = pickActiveRow(rows, currentMinutes);

      setRow(activeRow);

      const nextDelayMs = getDelayUntilNextBoundaryMs(rows);

      timeoutId = window.setTimeout(() => {
        void loadSignalAndScheduleNextRefresh();
      }, nextDelayMs);
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
        : "All Regions Stable";

    const corruptionLabel = formatCorruption(row.corruption);

    const reportText =
      typeof row.report_text === "string" && row.report_text.trim().length > 0
        ? row.report_text
        : DEFAULT_STABLE_VIEW.reportText;

    return {
      conditionLabel,
      regionLabel,
      corruptionLabel,
      reportText,
      isAlert: conditionLabel === "Unstable",
    };
  }, [row]);

  return { signal };
}
