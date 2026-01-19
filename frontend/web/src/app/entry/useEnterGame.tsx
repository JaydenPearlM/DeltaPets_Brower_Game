import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase/client";
import { useAuth } from "../providers/useAuth";

/**
 * Centralized entry logic:
 * - not logged in -> /
 * - logged in + has pet -> /pet
 * - logged in + no pet -> /create
 */
export function useEnterGame() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const enterGame = useCallback(async () => {
    setLoading(true);
    try {
      // Use live session user to avoid timing issues after login
      const { data, error: getUserErr } = await supabase.auth.getUser();
      if (getUserErr) throw getUserErr;

      const liveUser = data.user ?? user;

      if (!liveUser) {
        navigate("/", { replace: true });
        return;
      }

      const { data: pet, error } = await supabase
        .from("pets")
        .select("id")
        .eq("user_id", liveUser.id)
        .maybeSingle();

      if (error) throw error;

      navigate(pet?.id ? "/pet" : "/create", { replace: true });
    } catch (err) {
      console.error("enterGame failed:", err);
      navigate("/", { replace: true });
    } finally {
      setLoading(false);
    }
  }, [navigate, user]);

  return { loading, enterGame };
}
