import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase/client";

export default function AuthCallback() {
  const navigate = useNavigate();
  const [msg, setMsg] = useState("Finishing sign-in…");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      // Supabase will parse tokens in the URL and set the session
      const { data, error } = await supabase.auth.getSession();

      if (cancelled) return;

      if (error) {
        console.error("[auth] callback failed:", error.message ?? error);
        setMsg("Auth failed. Try logging in again.");
        window.setTimeout(() => navigate("/", { replace: true }), 1200);
        return;
      }

      if (!data.session) {
        // Sometimes the callback opens but session isn't set (edge cases)
        setMsg("No session found. Please log in.");
        window.setTimeout(() => navigate("/", { replace: true }), 1200);
        return;
      }

      setMsg("Verified Redirecting…");
      window.setTimeout(() => navigate("/", { replace: true }), 600);
    })();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <div style={{ padding: 16 }}>
      <h1>DeltaPets</h1>
      <p>{msg}</p>
    </div>
  );
}
