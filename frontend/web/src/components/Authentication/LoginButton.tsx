import { useAuth } from "../../app/providers/AuthProvider";

export function LoginButton() {
  const auth = useAuth();

  const handleLogin = async () => {
    await auth.signIn("test@email.com", "password123");
  };

  return <button onClick={handleLogin}>Login</button>;
}
