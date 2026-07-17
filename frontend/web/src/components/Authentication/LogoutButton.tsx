import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../app/providers/useAuth";

export function LogoutButton() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  return (
    <button
      type="button"
      className="btn btn-red"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        const { error } = await signOut();
        setBusy(false);

        if (error) {
          console.error("Logout failed:", error);
        }
        // No navigate() call here.
        // onAuthStateChange fires, sets user = null,
        // auth-guarded pages redirect themselves.
      }}
    >
      {busy ? "Logging out…" : "Logout"}
    </button>
  );
}
