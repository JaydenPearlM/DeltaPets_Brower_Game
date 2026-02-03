import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase/client";

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

  async function getAccessToken() {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;

    const token = data.session?.access_token;
    if (!token) throw new Error("Missing access token");

    return token;
  }

  const enterGame = useCallback(async () => {
    setLoading(true);

    try {
      // 1️⃣ Check auth
      const { data, error: userErr } = await supabase.auth.getUser();
      if (userErr) throw userErr;

      if (!data.user) {
        navigate("/", { replace: true });
        return;
      }

      // 2️⃣ Ask backend for authoritative state
      const token = await getAccessToken();

      const res = await fetch("/api/me/intro", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const payload = (await res.json().catch(() => ({}))) as {
        intro_seen?: boolean;
        has_hatchery_egg?: boolean;
        error?: string;
      };

      if (!res.ok) {
        throw new Error(payload?.error ?? "Intro state check failed");
      }

      const introSeen = !!payload.intro_seen;
      const hasEgg = !!payload.has_hatchery_egg;

      // 3️⃣ Route
      if (!introSeen) {
        navigate("/create", { replace: true });
        return;
      }

      if (hasEgg) {
        navigate("/hatchery", { replace: true });
        return;
      }

      navigate("/pet", { replace: true });
    } catch (err) {
      console.error("enterGame failed:", err);
      navigate("/", { replace: true });
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  return { loading, enterGame };
}
