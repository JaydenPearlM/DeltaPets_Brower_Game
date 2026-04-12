import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase/client";

const DEV = import.meta.env.DEV;

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
 * - intro seen + has egg     -> /hatchery
 * - intro seen + no egg      -> /pet
 *
 * Backend is authoritative to avoid RLS issues.
 */
export function useEnterGame() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const getAccessToken = useCallback(async () => {
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      throw new Error(error.message || "Failed to get session");
    }

    const token = data.session?.access_token;

    if (!token) {
      throw new Error("Missing bearer token");
    }

    return token;
  }, []);

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

      const token = await getAccessToken();

      const res = await fetch("/api/me/intro", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const payload = (await res.json().catch(() => ({}))) as {
        intro_seen?: boolean;
        has_hatchery_egg?: boolean;
        error?: string;
        details?: string;
      };

      debugLog("[enterGame] /api/me/intro status:", res.status);
      debugLog("[enterGame] /api/me/intro payload:", payload);

      if (!res.ok) {
        throw new Error(payload?.error ?? "Intro state check failed");
      }

      const introSeen = Boolean(payload.intro_seen);
      const hasEgg = Boolean(payload.has_hatchery_egg);

      debugLog("[enterGame] introSeen:", introSeen);
      debugLog("[enterGame] hasEgg:", hasEgg);

      if (!introSeen) {
        debugLog("[enterGame] routing -> /create");
        navigate("/create", { replace: true });
        return;
      }

      if (hasEgg) {
        debugLog("[enterGame] routing -> /hatchery");
        navigate("/hatchery", { replace: true });
        return;
      }

      debugLog("[enterGame] routing -> /pet");
      navigate("/pet", { replace: true });
    } catch (err) {
      console.error("[enterGame] failed:", err);
      navigate("/", { replace: true });
      throw err;
    } finally {
      setLoading(false);
    }
  }, [getAccessToken, navigate]);

  return { loading, enterGame };
}
