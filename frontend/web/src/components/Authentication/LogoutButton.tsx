import { useAuth } from "../../app/providers/AuthProvider";

export function LogoutButton() {
  const auth = useAuth();

  return <button onClick={auth.signOut}>Logout</button>;
}
