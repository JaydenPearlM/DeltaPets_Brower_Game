import { useState } from "react";
import type { FormEvent } from "react";
import { useAuth } from "../../app/providers/useAuth";
import "./authentication.css";

export function SignupForm() {
  const { signUp, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      await signUp(email.trim(), password);
      setSuccess(
        "Account created. If email confirmation is on, check your inbox.",
      );
    } catch (err: any) {
      setError(err?.message ?? "Signup failed");
    }
  };

  return (
    <form onSubmit={onSubmit} className="auth-stack">
      <input
        type="email"
        placeholder="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoComplete="email"
        required
      />
      <input
        placeholder="password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="new-password"
        minLength={8}
        required
      />
      <button type="submit" disabled={loading}>
        {loading ? "Creating…" : "Create Account"}
      </button>

      {error ? <p className="auth-message error">Error: {error}</p> : null}
      {success ? <p className="auth-message success">{success}</p> : null}
    </form>
  );
}
