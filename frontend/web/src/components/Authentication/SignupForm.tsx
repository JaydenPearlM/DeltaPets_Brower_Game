import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { supabase } from "../../lib/supabase/client";

type SignupFormProps = {
  onSuccess: () => void; // usually closes the modal
  onMessage: (msg: string | null) => void;
};

function normalizeUsername(input: string) {
  return input.trim().toLowerCase();
}

function isValidUsername(username: string) {
  return /^[a-z0-9_]{3,20}$/.test(username);
}

function looksLikeEmailAlreadyUsed(message: string) {
  const m = message.toLowerCase();
  return (
    m.includes("already registered") ||
    m.includes("already exists") ||
    m.includes("user already") ||
    m.includes("email already") ||
    m.includes("already in use")
  );
}

export function SignupForm({ onSuccess, onMessage }: SignupFormProps) {
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [birthday, setBirthday] = useState(""); // collected for now
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rewritePassword, setRewritePassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!error && !success) return;
    setError(null);
    setSuccess(null);
    onMessage(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayName, username, birthday, email, password, rewritePassword]);

  function fail(msg: string) {
    setError(msg);
    onMessage(msg);
  }

  function ok(msg: string) {
    setSuccess(msg);
    onMessage(msg);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    onMessage(null);

    const cleanName = displayName.trim();
    const cleanUsername = normalizeUsername(username);
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName) return fail("Account not created: missing name.");

    if (!isValidUsername(cleanUsername)) {
      return fail(
        "Account not created: username must be 3–20 chars and use letters, numbers, or underscores.",
      );
    }

    if (!birthday) return fail("Account not created: missing birthday.");

    if (password.length < 8) {
      return fail(
        "Account not created: password must be at least 8 characters.",
      );
    }

    if (password !== rewritePassword) {
      return fail("Account not created: passwords do not match.");
    }

    setLoading(true);
    try {
      const { data, error: authErr } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          // keep this even if you’re not using verification right now
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            username: cleanUsername,
            display_name: cleanName,
          },
        },
      });

      if (authErr) {
        const msg = String(authErr.message ?? authErr);

        if (looksLikeEmailAlreadyUsed(msg)) {
          return fail("Email already exists. Try logging in instead.");
        }

        return fail(`Account not created: ${msg}`);
      }

      // ✅ If confirmations are OFF, Supabase may auto-create a session.
      // We do NOT want to auto-enter the game on signup.
      if (data?.session) {
        await supabase.auth.signOut();
      }

      ok("Account created ✅ Now log in with your email + password.");
      onSuccess(); // close modal / return to login UI
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="auth-stack">
      <input
        placeholder="Name"
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
        autoComplete="name"
        required
      />

      <input
        placeholder="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        autoComplete="username"
        required
      />

      <input
        type="date"
        value={birthday}
        onChange={(e) => setBirthday(e.target.value)}
        required
      />

      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoComplete="email"
        required
      />

      <input
        placeholder="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="new-password"
        minLength={8}
        required
      />

      <input
        placeholder="Rewrite Password"
        type="password"
        value={rewritePassword}
        onChange={(e) => setRewritePassword(e.target.value)}
        autoComplete="new-password"
        minLength={8}
        required
      />

      <button type="submit" disabled={loading}>
        {loading ? "Creating…" : "Create Account"}
      </button>

      {error ? <p className="auth-message">{error}</p> : null}
      {success ? <p className="auth-message">{success}</p> : null}
    </form>
  );
}
