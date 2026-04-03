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
  report_age_days?: number | null;
  start_time?: string | null;
  end_time?: string | null;
};

type SignalView = {
  conditionLabel: string;
  regionLabel: string;
  corruptionLabel: string;
  reportText: string;
  isAlert: boolean;
  showReportAge: boolean;
  reportAgeLabel: string;
};

const DEFAULT_STABLE_VIEW: SignalView = {
  conditionLabel: "Stable",
  regionLabel: "All Regions Stable",
  corruptionLabel: "None",
  reportText:
    "Aliune remains calm. No active portal disturbances are being reported at this time.",
  isAlert: false,
  showReportAge: true,
  reportAgeLabel: "0",
};

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

function formatRelativeAge(reportAgeDays?: number | null): string {
  if (typeof reportAgeDays === "number" && Number.isFinite(reportAgeDays)) {
    return String(reportAgeDays);
  }

  return "0";
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
  if (start === null && end !== null) return currentMinutes <= end;
  if (start === end) return true;

  if (start !== null && end !== null && start < end) {
    return currentMinutes >= start && currentMinutes < end;
  }

  if (start !== null && end !== null) {
    return currentMinutes >= start || currentMinutes < end;
  }

  return false;
}

function pickRandomRow(rows: SignalRow[]): SignalRow | null {
  if (!Array.isArray(rows) || rows.length === 0) return null;

  const index = Math.floor(Math.random() * rows.length);
  return rows[index] ?? null;
}

export function useAliuneSignal() {
  const [row, setRow] = useState<SignalRow | null>(null);

  useEffect(() => {
    let alive = true;

    async function loadSignal() {
      const { data, error } = await supabase
        .from("aliune_signal_reports")
        .select(
          "id, enabled, condition, region, corruption, report_text, report_age_days, start_time, end_time",
        )
        .eq("enabled", true)
        .order("start_time", { ascending: true });

      if (!alive) return;

      if (error) {
        console.error("[aliune-signal] fetch failed", error);
        setRow(null);
        return;
      }

      const rows: SignalRow[] = Array.isArray(data) ? data : [];
      const currentMinutes = getCurrentLocalMinutes();

      const activeRows = rows.filter((item) =>
        isActiveForDailyWindow(currentMinutes, item.start_time, item.end_time),
      );

      const nextRow = pickRandomRow(activeRows);

      console.log("[aliune-signal] current local minutes", currentMinutes);
      console.log("[aliune-signal] active rows", activeRows);
      console.log("[aliune-signal] chosen row", nextRow);

      setRow(nextRow);
    }

    void loadSignal();

    const intervalId = window.setInterval(() => {
      void loadSignal();
    }, 15_000);

    return () => {
      alive = false;
      window.clearInterval(intervalId);
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

    const reportAgeLabel = formatRelativeAge(row.report_age_days);

    return {
      conditionLabel,
      regionLabel,
      corruptionLabel,
      reportText,
      isAlert: conditionLabel === "Unstable",
      showReportAge: true,
      reportAgeLabel,
    };
  }, [row]);

  return { signal };
}
