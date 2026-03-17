import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase/client";

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
      // Small delay helps right after login/signup while session finishes hydrating.
      await sleep(150);

      // 1) Check auth
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

      // 2) Ask backend for authoritative routing state
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

      console.log("[enterGame] /api/me/intro status:", res.status);
      console.log("[enterGame] /api/me/intro payload:", payload);

      if (!res.ok) {
        throw new Error(payload?.error ?? "Intro state check failed");
      }

      const introSeen = Boolean(payload.intro_seen);
      const hasEgg = Boolean(payload.has_hatchery_egg);

      console.log("[enterGame] introSeen:", introSeen);
      console.log("[enterGame] hasEgg:", hasEgg);

      // 3) Route
      if (!introSeen) {
        console.log("[enterGame] routing -> /create");
        navigate("/create", { replace: true });
        return;
      }

      if (hasEgg) {
        console.log("[enterGame] routing -> /hatchery");
        navigate("/hatchery", { replace: true });
        return;
      }

      console.log("[enterGame] routing -> /pet");
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
