import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import "./LoginMenus.css";

import { LoginButton } from "./LoginButton";
import { SignupButton } from "./SignupButton";
import { LoginForm } from "./LoginForm";
import { LoginSubmitButton } from "./LoginSubmitButton";
import { useLoginSubmit } from "./LoginSubmit";

import { supabase } from "../../lib/supabase/client";

type Mode = "none" | "login";

const AUTO_CLOSE_MS = 2 * 60 * 1000; // 2 minutes

type LoginPanelProps = {
  identifier: string;
  setIdentifier: (v: string) => void;
  message: string | null;
  setMessage: (v: string | null) => void;
  closeLogin: () => void;
};

function PasswordField({
  label,
  value,
  onChange,
  autoComplete,
  placeholder = "••••••••",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
  placeholder?: string;
}) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div>
      <label>
        {label}
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            type={showPassword ? "text" : "password"}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            autoComplete={autoComplete}
            placeholder={placeholder}
            style={{ flex: 1 }}
            required
          />

          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            title={showPassword ? "Hide password" : "Show password"}
            style={{
              display: "grid",
              placeItems: "center",
              width: 40,
              height: 40,
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.18)",
              background: "transparent",
              cursor: "pointer",
            }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" />
              <circle cx="12" cy="12" r="3" />
              {showPassword ? null : <path d="M3 3l18 18" />}
            </svg>
          </button>
        </div>
      </label>
    </div>
  );
}

function LoginPanel({
  identifier,
  setIdentifier,
  message,
  setMessage,
  closeLogin,
}: LoginPanelProps) {
  const [password, setPassword] = useState("");
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  const { loading: loginLoading, handleSubmit: handleLoginSubmit } =
    useLoginSubmit({
      identifier,
      password,
      captchaToken,
      onMessage: setMessage,
      onAfterAttempt: () => setCaptchaToken(null),
    });

  useEffect(() => {
    const t = window.setTimeout(() => {
      setMessage(null);
      setPassword("");
      setCaptchaToken(null);
      closeLogin();
    }, AUTO_CLOSE_MS);

    return () => window.clearTimeout(t);
  }, [closeLogin, setMessage]);

  useEffect(() => {
    setMessage(null);
    setPassword("");
    setCaptchaToken(null);
  }, [setMessage]);

  return (
    <div className="auth-shell-panel">
      <form onSubmit={handleLoginSubmit}>
        <LoginForm
          identifier={identifier}
          password={password}
          setIdentifier={setIdentifier}
          setPassword={setPassword}
        />

        <div className="login-actions" style={{ marginTop: 12 }}>
          <LoginSubmitButton loading={loginLoading} />
          <button type="button" onClick={closeLogin} disabled={loginLoading}>
            Close
          </button>
        </div>
      </form>

      {message ? <p className="auth-message">{message}</p> : null}
    </div>
  );
}

function normalizeUsername(raw: string) {
  return raw.trim().toLowerCase();
}

function isValidUsername(u: string) {
  // keep it simple for Alpha: letters, numbers, underscore, 3-20 chars
  return /^[a-z0-9_]{3,20}$/.test(u);
}

function SignupPanel({
  identifier,
  setIdentifier,
  message,
  setMessage,
  closeSignup,
}: {
  identifier: string;
  setIdentifier: (v: string) => void;
  message: string | null;
  setMessage: (v: string | null) => void;
  closeSignup: () => void;
}) {
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const email = useMemo(() => identifier.trim().toLowerCase(), [identifier]);
  const usernameNorm = useMemo(() => normalizeUsername(username), [username]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setMessage(null);

    if (!displayName.trim()) {
      setMessage("Name is required.");
      return;
    }

    if (!email || !email.includes("@")) {
      setMessage("Please enter a valid email address.");
      return;
    }

    if (!usernameNorm) {
      setMessage("Username is required.");
      return;
    }

    if (!isValidUsername(usernameNorm)) {
      setMessage(
        "Username must be 3–20 chars and use only letters, numbers, underscore.",
      );
      return;
    }

    if (!password || password.length < 8) {
      setMessage("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirm) {
      setMessage("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      // 1) Pre-check: no duplicate usernames
      const { data: existing, error: existingErr } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("username", usernameNorm)
        .maybeSingle();

      if (existingErr) {
        console.error(existingErr);
        setMessage("Could not verify username. Please try again.");
        return;
      }

      if (existing?.user_id) {
        setMessage("That username is already taken.");
        return;
      }

      // 2) Create auth user
      const { data: signUpData, error: signUpErr } = await supabase.auth.signUp(
        {
          email,
          password,
          options: {
            data: {
              username: usernameNorm,
              display_name: displayName.trim(),
            },
          },
        },
      );

      if (signUpErr) {
        setMessage(signUpErr.message ?? "Signup failed.");
        return;
      }

      const userId = signUpData.user?.id ?? null;

      // 3) Create profile row (only if we have the user id immediately)
      // If your Supabase requires email confirmation, userId may still exist,
      // but session might be null — that's okay.
      if (userId) {
        const { error: profileErr } = await supabase.from("profiles").insert({
          user_id: userId,
          username: usernameNorm,
          display_name: displayName.trim(),
          email,
        });

        if (profileErr) {
          // If this fails, you REALLY want a DB unique constraint on username too.
          console.error(profileErr);
          setMessage(
            "Account created, but profile setup failed. Please contact support.",
          );
          return;
        }
      }

      // 4) Close modal + force the user to press Login next (your requested flow)
      // If Supabase auto-signed them in, sign them out so they must login.
      await supabase.auth.signOut();

      setMessage("Account created! Now press Login.");
      closeSignup();
    } catch (err) {
      console.error("Signup failed:", err);
      setMessage("Signup failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit}>
      <div>
        <label>
          Name
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            autoComplete="name"
            placeholder="Jayden"
            required
          />
        </label>
      </div>

      <div>
        <label>
          UserName
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            placeholder="jayden_6790"
            required
          />
        </label>
        <p style={{ fontSize: 12, opacity: 0.8, marginTop: 6 }}>
          3–20 chars. Letters/numbers/underscore only.
        </p>
      </div>

      <div>
        <label>
          Email
          <input
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            autoComplete="email"
            placeholder="you@example.com"
            required
          />
        </label>
      </div>

      <PasswordField
        label="Password"
        value={password}
        onChange={setPassword}
        autoComplete="new-password"
      />

      <PasswordField
        label="Confirm Password"
        value={confirm}
        onChange={setConfirm}
        autoComplete="new-password"
      />

      <div className="login-actions" style={{ marginTop: 12 }}>
        <button type="submit" disabled={loading}>
          {loading ? "Creating..." : "Create Account"}
        </button>
        <button type="button" onClick={closeSignup} disabled={loading}>
          Close
        </button>
      </div>

      {message ? <p className="auth-message">{message}</p> : null}
    </form>
  );
}

export function LoginMenus() {
  const [mode, setMode] = useState<Mode>("none");
  const [signupOpen, setSignupOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [identifier, setIdentifier] = useState(() => {
    return localStorage.getItem("dp_login_identifier") ?? "";
  });

  useEffect(() => {
    localStorage.setItem("dp_login_identifier", identifier);
  }, [identifier]);

  function openLogin() {
    setMessage(null);
    setMode("login");
    setSignupOpen(false);
  }

  function openSignup() {
    setMessage(null);
    setSignupOpen(true);
    setMode("none");
  }

  function closeLogin() {
    setMode("none");
    setMessage(null);
  }

  function closeSignup() {
    setSignupOpen(false);
    // do NOT clear message here — we want "Account created! Now press Login."
    // to remain visible on the main screen.
  }

  return (
    <div className="auth-shell">
      <div className="auth-shell-top">
        <LoginButton onClick={openLogin} />
        <SignupButton onClick={openSignup} />
      </div>

      {message ? <p className="auth-message">{message}</p> : null}

      {mode === "login" && (
        <LoginPanel
          identifier={identifier}
          setIdentifier={setIdentifier}
          message={message}
          setMessage={setMessage}
          closeLogin={closeLogin}
        />
      )}

      {signupOpen && (
        <div
          className="auth-modal-backdrop"
          role="presentation"
          onClick={() => {
            setSignupOpen(false);
          }}
        >
          <div
            className="auth-modal"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="auth-modal-header">
              <h3>Create Account</h3>
              <button type="button" onClick={() => setSignupOpen(false)}>
                X
              </button>
            </div>

            <SignupPanel
              identifier={identifier}
              setIdentifier={setIdentifier}
              message={null}
              setMessage={setMessage}
              closeSignup={closeSignup}
            />
          </div>
        </div>
      )}
    </div>
  );
}
