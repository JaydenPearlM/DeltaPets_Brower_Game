import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase/client";
import { useEnterGame } from "../entry/useEnterGame";

export default function AuthCallback() {
  const navigate = useNavigate();
  const { enterGame } = useEnterGame();
  const [msg, setMsg] = useState("Finishing sign-in…");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { data, error } = await supabase.auth.getSession();

      if (cancelled) return;

      if (error) {
        console.error("[auth] callback failed:", error.message ?? error);
        setMsg("Auth failed. Try logging in again.");
        window.setTimeout(() => navigate("/", { replace: true }), 1200);
        return;
      }

      if (!data.session) {
        setMsg("No session found. Please log in.");
        window.setTimeout(() => navigate("/", { replace: true }), 1200);
        return;
      }

      setMsg("Verified. Entering game…");
      await enterGame();
    })();

    return () => {
      cancelled = true;
    };
  }, [enterGame, navigate]);

  return (
    <div style={{ padding: 16 }}>
      <h1>DeltaPets</h1>
      <p>{msg}</p>
    </div>
  );
}
