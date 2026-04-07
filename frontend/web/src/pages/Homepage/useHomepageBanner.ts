import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

export type HomepageBannerTheme = "yellow" | "red" | "blue" | "pink" | "green";

export type HomepageBannerData = {
  enabled: boolean;
  theme: HomepageBannerTheme;
  items: string[];
  ctaLabel?: string;
  ctaHref?: string;
};

type UseHomepageBannerResult = {
  banner: HomepageBannerData | null;
  loading: boolean;
  error: string;
  usingFallback: boolean;
};

type HomepageAlertRow = {
  enabled?: boolean | null;
  is_active?: boolean | null;
  message?: string | null;
  messages?: string[] | string | null;
  alert_color?: string | null;
  alert_type?: string | null;
  cta_label?: string | null;
  cta_href?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  updated_at?: string | null;
};

const FALLBACK_BANNER: HomepageBannerData = {
  enabled: true,
  theme: "yellow",
  items: [
    "The Voltet are hovering over a specific city — Eliza",
    '"It’s a Beautiful Day! The Sun is shining." — Eliza',
  ],
};

function isBannerTheme(value: unknown): value is HomepageBannerTheme {
  return (
    value === "yellow" ||
    value === "red" ||
    value === "blue" ||
    value === "pink" ||
    value === "green"
  );
}

function normalizeTheme(value: unknown): HomepageBannerTheme {
  return isBannerTheme(value) ? value : "yellow";
}

function splitMessageBlob(value: string): string[] {
  return value
    .split(/\n+|\s*\|\|\s*|\s*•\s*/g)
    .map((part) => part.trim())
    .filter(Boolean);
}

function extractMessages(row: HomepageAlertRow): string[] {
  const rawMessages = row.messages;

  if (Array.isArray(rawMessages)) {
    return rawMessages.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof rawMessages === "string" && rawMessages.trim().length > 0) {
    return splitMessageBlob(rawMessages);
  }

  if (typeof row.message === "string" && row.message.trim().length > 0) {
    return splitMessageBlob(row.message);
  }

  return [];
}

function isWithinTimeWindow(row: HomepageAlertRow, now: number): boolean {
  const startsAt = row.starts_at ? new Date(row.starts_at).getTime() : null;
  const endsAt = row.ends_at ? new Date(row.ends_at).getTime() : null;

  const startsOk =
    startsAt == null || Number.isNaN(startsAt) || startsAt <= now;
  const endsOk = endsAt == null || Number.isNaN(endsAt) || endsAt >= now;

  return startsOk && endsOk;
}

function isRowEnabled(row: HomepageAlertRow): boolean {
  if (typeof row.enabled === "boolean") return row.enabled;
  if (typeof row.is_active === "boolean") return row.is_active;
  return true;
}

function normalizeRows(rows: HomepageAlertRow[]): HomepageBannerData | null {
  const now = Date.now();

  const activeRows = rows
    .filter((row) => isRowEnabled(row))
    .filter((row) => isWithinTimeWindow(row, now));

  if (activeRows.length === 0) {
    return null;
  }

  const primaryRow = activeRows[0];
  const messages = activeRows.flatMap(extractMessages).filter(Boolean);

  if (messages.length === 0) {
    return null;
  }

  return {
    enabled: true,
    theme: normalizeTheme(primaryRow.alert_color),
    items: messages,
    ctaLabel:
      typeof primaryRow.cta_label === "string" && primaryRow.cta_label.trim()
        ? primaryRow.cta_label.trim()
        : undefined,
    ctaHref:
      typeof primaryRow.cta_href === "string" && primaryRow.cta_href.trim()
        ? primaryRow.cta_href.trim()
        : undefined,
  };
}

export function useHomepageBanner(): UseHomepageBannerResult {
  const [banner, setBanner] = useState<HomepageBannerData | null>(
    FALLBACK_BANNER,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [usingFallback, setUsingFallback] = useState(false);

  const loadBanner = useCallback(async () => {
    setError("");

    const { data, error } = await supabase
      .from("homepage_alerts")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(8);

    if (error) {
      console.error("[homepage_banner] fetch failed", error);
      setBanner(FALLBACK_BANNER);
      setUsingFallback(true);
      setError(error.message || "Failed to load homepage banner.");
      setLoading(false);
      return;
    }

    const rows = Array.isArray(data) ? (data as HomepageAlertRow[]) : [];
    const normalizedBanner = normalizeRows(rows);

    if (!normalizedBanner) {
      setBanner(FALLBACK_BANNER);
      setUsingFallback(true);
      setLoading(false);
      return;
    }

    setBanner(normalizedBanner);
    setUsingFallback(false);
    setLoading(false);
  }, []);

  useEffect(() => {
    let active = true;

    async function runInitialLoad() {
      setLoading(true);
      await loadBanner();
      if (!active) return;
    }

    void runInitialLoad();

    const handleWindowFocus = () => {
      void loadBanner();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void loadBanner();
      }
    };

    window.addEventListener("focus", handleWindowFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      active = false;
      window.removeEventListener("focus", handleWindowFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [loadBanner]);

  return { banner, loading, error, usingFallback };
}
