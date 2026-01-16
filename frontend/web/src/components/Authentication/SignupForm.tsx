import { useState } from "react";
import { useAuth } from "../../app/providers/AuthProvider";

export function SignupForm() {
  const { signUp, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await signUp(email, password);
    } catch (err: any) {
      setError(err?.message ?? "Signup failed");
    }
  };

  return (
    <form onSubmit={onSubmit}>
      <input
        placeholder="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoComplete="email"
      />
      <input
        placeholder="password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="new-password"
      />
      <button type="submit" disabled={loading}>
        Create Account
      </button>
      {error && <p>{error}</p>}
    </form>
  );
}
