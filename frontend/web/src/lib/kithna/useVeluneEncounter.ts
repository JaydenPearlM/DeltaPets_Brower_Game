import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { VELUNE_ELIGIBLE_LOCATION_KEYS } from "@shared/pets/species";
import { apiFetch, ApiError } from "../api/baseClient";

export type VeluneEncounterResult = {
  attempted: boolean;
  sighted: boolean;
  egg_awarded: boolean;
  reason?: string | null;
  retry_after_ms?: number;
  egg_id?: string | null;
  message?: string | null;
};

const eligibleLocations = new Set<string>(VELUNE_ELIGIBLE_LOCATION_KEYS);

export function useVeluneEncounter(enabled: boolean) {
  const location = useLocation();
  const [result, setResult] = useState<VeluneEncounterResult | null>(null);
  const stoppedRef = useRef(false);
  const initializedRef = useRef(false);
  const lastVisitRef = useRef("");

  useEffect(() => {
    if (!enabled) {
      stoppedRef.current = false;
      initializedRef.current = false;
      lastVisitRef.current = "";
      setResult(null);
      return;
    }

    const testOutcome = import.meta.env.DEV
      ? new URLSearchParams(location.search).get("veluneTest")
      : null;
    const forceOutcome =
      testOutcome === "none" ||
      testOutcome === "sighting" ||
      testOutcome === "egg"
        ? testOutcome
        : undefined;

    if (!initializedRef.current) {
      initializedRef.current = true;
      lastVisitRef.current = `${location.pathname}${location.search}`;
      if (!forceOutcome) return;
    }

    if (stoppedRef.current || !eligibleLocations.has(location.pathname)) {
      return;
    }

    const visitKey = `${location.pathname}${location.search}`;
    if (lastVisitRef.current === visitKey && !forceOutcome) return;
    lastVisitRef.current = visitKey;

    let cancelled = false;

    void apiFetch<VeluneEncounterResult>("/api/kithna/velune/roam", {
      method: "POST",
      json: {
        locationKey: location.pathname,
        ...(forceOutcome ? { forceOutcome } : {}),
      },
    })
      .then((response) => {
        if (cancelled) return;

        if (response.reason === "completed" || response.egg_awarded) {
          stoppedRef.current = true;
        }

        if (response.sighted) {
          setResult(response);
        }
      })
      .catch((error) => {
        if (!cancelled && !(error instanceof ApiError)) {
          console.error("[useVeluneEncounter] unexpected error", error);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, location.pathname, location.search]);

  return {
    result,
    clearResult: () => setResult(null),
  };
}
