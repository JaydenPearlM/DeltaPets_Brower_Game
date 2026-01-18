import { useAuth } from "../../app/providers/useAuth";

export function LogoutButton() {
  const { signOut, loading } = useAuth();

  return (
    <button type="button" onClick={signOut} disabled={loading}>
      Logout
    </button>
  );
}
