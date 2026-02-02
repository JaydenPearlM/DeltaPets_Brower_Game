import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase/client";

/**
 * Centralized entry logic (single source of truth for your current Alpha flow):
 * - not logged in -> /
 * - intro cutscene NOT seen -> /create
 * - intro seen + has an egg -> /hatchery
 * - intro seen + no egg -> /pet
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
      const { data, error: getUserErr } = await supabase.auth.getUser();
      if (getUserErr) throw getUserErr;
      if (!data.user) {
        navigate("/", { replace: true });
        return;
      }

      // Use backend for authoritative state (avoids RLS weirdness)
      const token = await getAccessToken();

      const introRes = await fetch("/api/me/intro", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const introData = (await introRes.json().catch(() => ({}))) as any;
      if (!introRes.ok)
        throw new Error(introData?.error ?? "Intro check failed");

      const introSeen = !!introData.intro_seen;
      const hasEgg = !!introData.has_hatchery_egg;

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
