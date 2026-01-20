import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase/client";

/**
 * Centralized entry logic:
 * - not logged in -> /
 * - logged in + has pet -> /pet
 * - logged in + no pet -> /create
 */
export function useEnterGame() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const enterGame = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error: getUserErr } = await supabase.auth.getUser();
      if (getUserErr) throw getUserErr;

      const liveUser = data.user;

      if (!liveUser) {
        navigate("/", { replace: true });
        return;
      }

      const { data: pet, error: petErr } = await supabase
        .from("pets")
        .select("id")
        .eq("user_id", liveUser.id)
        .maybeSingle();

      if (petErr) {
        console.error("enterGame pet check failed:", petErr);
        // If this happens, it's usually RLS or table mismatch.
        navigate("/", { replace: true });
        return;
      }

      navigate(pet?.id ? "/pet" : "/create", { replace: true });
    } catch (err) {
      console.error("enterGame failed:", err);
      navigate("/", { replace: true });
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  return { loading, enterGame };
}
