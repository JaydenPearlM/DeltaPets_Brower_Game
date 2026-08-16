import { useState } from "react";
import { useAuth } from "../../app/providers/useAuth";

export function LogoutButton() {
  const { signOut } = useAuth();
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
      }}
    >
      {busy ? "Logging out…" : "Logout"}
    </button>
  );
}
