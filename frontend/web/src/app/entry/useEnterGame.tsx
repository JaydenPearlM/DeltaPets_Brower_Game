import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../../lib/api/baseClient";
import { supabase } from "../../lib/supabase/client";

import { entryDestination } from "./entryDestination";

const DEV = import.meta.env.DEV;

type IntroStateResponse = {
  intro_seen?: boolean;
  has_hatchery_egg?: boolean;
  has_hatched_pet?: boolean;
};

function debugLog(...args: unknown[]) {
  if (DEV) {
    console.log(...args);
  }
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

/**
 * Centralized entry logic (single source of truth for Alpha):
 *
 * - not logged in            -> /
 * - new player              -> /first-entry -> /create
 * - no hatched pet + egg    -> /hatchery
 * - intro seen, no egg/pet  -> /create
 * - hatched pet exists                -> /pets
 *
 * Backend is authoritative to avoid RLS issues.
 */
export function useEnterGame() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const enterGame = useCallback(async () => {
    setLoading(true);

    try {
      await sleep(150);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw new Error(userError.message || "Failed to load user");
      }

      if (!user) {
        console.warn("[enterGame] no authenticated user, routing to /");
        navigate("/", { replace: true });
        return;
      }

      const payload = await apiFetch<IntroStateResponse>("/api/me/intro");

      debugLog("[enterGame] /api/me/intro payload:", payload);

      const destination = entryDestination(payload);
      debugLog("[enterGame] routing ->", destination);
      navigate(destination, { replace: true });
    } catch (err) {
      console.error("[enterGame] failed:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  return { loading, enterGame };
}
