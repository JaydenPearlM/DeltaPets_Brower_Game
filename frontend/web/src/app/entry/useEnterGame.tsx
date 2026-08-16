import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../../lib/api/baseClient";
import { supabase } from "../../lib/supabase/client";

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
 * - intro cutscene NOT seen  -> /create
 * - intro seen + no hatched pet + egg -> /hatchery
 * - hatched pet exists                -> /profile
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

      const introSeen = Boolean(payload.intro_seen);
      const hasEgg = Boolean(payload.has_hatchery_egg);
      const hasHatchedPet = Boolean(payload.has_hatched_pet);

      debugLog("[enterGame] introSeen:", introSeen);
      debugLog("[enterGame] hasEgg:", hasEgg);
      debugLog("[enterGame] hasHatchedPet:", hasHatchedPet);

      if (!introSeen) {
        debugLog("[enterGame] routing -> /create");
        navigate("/create", { replace: true });
        return;
      }

      if (!hasHatchedPet && hasEgg) {
        debugLog(
          "[enterGame] intro egg still incubating, routing -> /hatchery",
        );
        navigate("/hatchery", { replace: true });
        return;
      }

      if (!hasHatchedPet) {
        debugLog(
          "[enterGame] intro incomplete with no pet, routing -> /create",
        );
        navigate("/create", { replace: true });
        return;
      }

      debugLog("[enterGame] returning player, routing -> /profile");
      navigate("/profile", { replace: true });
    } catch (err) {
      console.error("[enterGame] failed:", err);
      navigate("/", { replace: true });
      throw err;
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  return { loading, enterGame };
}
