import { useAuth } from "../../app/providers/AuthProvider";

export function SignupButton() {
  const auth = useAuth();

  const handleSignup = async () => {
    await auth.signUp("test@email.com", "password123");
  };

  return <button onClick={handleSignup}>Create Account</button>;
}
