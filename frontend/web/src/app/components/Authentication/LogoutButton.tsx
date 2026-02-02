import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../providers/useAuth";

export function LogoutButton() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        const { error } = await signOut();
        setBusy(false);

        if (!error) {
          navigate("/"); // ✅ bounce back to homepage
        } else {
          console.error("Logout failed:", error);
        }
      }}
    >
      {busy ? "Logging out…" : "Logout"}
    </button>
  );
}
