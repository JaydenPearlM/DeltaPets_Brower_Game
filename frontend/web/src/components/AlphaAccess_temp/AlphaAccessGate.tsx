import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import "./AlphaAccessGate.css";

const ALPHA_ACCESS_STORAGE_KEY = "deltapets_alpha_access";

type AlphaAccessGateProps = {
  children: ReactNode;
};

export function AlphaAccessGate({ children }: AlphaAccessGateProps) {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setIsUnlocked(
      window.localStorage.getItem(ALPHA_ACCESS_STORAGE_KEY) === "granted",
    );
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/alpha-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        throw new Error("Incorrect alpha password.");
      }

      window.localStorage.setItem(ALPHA_ACCESS_STORAGE_KEY, "granted");
      setIsUnlocked(true);
    } catch {
      window.localStorage.removeItem(ALPHA_ACCESS_STORAGE_KEY);
      setError("That password did not unlock the Closed Alpha.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isUnlocked) {
    return <>{children}</>;
  }

  return (
    <main className="alphaAccessGate">
      <section className="alphaAccessCard" aria-labelledby="alpha-access-title">
        <p className="alphaAccessEyebrow">Closed Alpha Access</p>
        <h1 id="alpha-access-title">DeltaPets is locked for testing</h1>
        <p className="alphaAccessCopy">
          Enter the Closed Alpha password before signing in or creating a tester
          account.
        </p>

        <form className="alphaAccessForm" onSubmit={handleSubmit}>
          <label className="alphaAccessLabel" htmlFor="alpha-access-password">
            Alpha Password
          </label>
          <input
            id="alpha-access-password"
            className="alphaAccessInput"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="off"
            autoFocus
          />

          {error ? <p className="alphaAccessError">{error}</p> : null}

          <button
            type="submit"
            className="alphaAccessButton"
            disabled={isSubmitting || password.trim().length === 0}
          >
            {isSubmitting ? "Checking..." : "Enter Closed Alpha"}
          </button>
        </form>
      </section>
    </main>
  );
}
