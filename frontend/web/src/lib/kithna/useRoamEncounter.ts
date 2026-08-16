import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { apiFetch, ApiError } from "../api/baseClient";

export type RoamEncounterResult = {
  found: boolean;
  reason?: "cooldown" | "no_find" | "no_pool" | "hatchery_full";
  retry_after_ms?: number;
  egg_name?: string;
  egg_visual?: {
    displayName: string;
    shellColor: string;
    markingColor: string;
    glowColor: string;
  };
  time_of_day?: "day" | "night";
  xp_awarded?: number;
};

/**
 * Calls POST /api/kithna/roam on every route change while the user is
 * logged in. Backend enforces its own cooldown and find chance, this
 * hook just fires the check, it does not do any local rate limiting.
 *
 * Returns the most recent found-egg result, or null if nothing to show.
 * Call clearResult() after displaying it so the same result doesn't
 * linger across the next navigation.
 */
export function useRoamEncounter(enabled: boolean) {
  const location = useLocation();
  const [result, setResult] = useState<RoamEncounterResult | null>(null);
  const lastPathRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      lastPathRef.current = null;
      return;
    }

    // Only fire on an actual path change, not on query/hash-only changes
    // or the initial mount duplicating a call react-router already made.
    if (lastPathRef.current === location.pathname) return;
    lastPathRef.current = location.pathname;

    let cancelled = false;

    (async () => {
      try {
        const data = await apiFetch<RoamEncounterResult>("/api/kithna/roam", {
          method: "POST",
        });

        if (!cancelled && data.found) {
          setResult(data);
        }
      } catch (err) {
        // Silent by design, a roam encounter failing should never
        // interrupt normal navigation. ApiError already carries enough
        // context if this ever needs surfacing in logs.
        if (!(err instanceof ApiError)) {
          console.error("[useRoamEncounter] unexpected error", err);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, location.pathname]);

  function clearResult() {
    setResult(null);
  }

  return { result, clearResult };
}
