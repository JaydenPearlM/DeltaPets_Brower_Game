import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../app/providers/useAuth";
import { supabase } from "../lib/supabase/client";

export default function Homepage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  const [entering, setEntering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleEnterGame() {
    if (!user) return; // button won't show anyway
    setEntering(true);
    setError(null);

    // ✅ Pet existence check (simple)
    // Change owner_id -> user_id if that's your schema
    const { data, error } = await supabase
      .from("pets")
      .select("id")
      .eq("user_id", user.id)
      .limit(1);

    setEntering(false);

    if (error) {
      setError(error.message);
      return;
    }

    const hasPet = Array.isArray(data) && data.length > 0;

    if (hasPet) navigate("/pet");
    else navigate("/create");
  }

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ marginBottom: 12 }}>DeltaPets</h1>

      {loading ? (
        <p>Loading…</p>
      ) : user ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
            maxWidth: 280,
          }}
        >
          <button
            type="button"
            onClick={handleEnterGame}
            disabled={entering}
            style={{
              padding: "10px 14px",
              cursor: entering ? "not-allowed" : "pointer",
            }}
          >
            {entering ? "Entering…" : "Enter Game"}
          </button>

          {error ? <p style={{ margin: 0 }}>Error: {error}</p> : null}
        </div>
      ) : (
        <div style={{ display: "flex", gap: 10 }}>
          <button
            type="button"
            onClick={() => navigate("/login")}
            style={{ padding: "10px 14px" }}
          >
            Login
          </button>

          <button
            type="button"
            onClick={() => navigate("/register")}
            style={{ padding: "10px 14px" }}
          >
            Register
          </button>
        </div>
      )}
    </div>
  );
}
