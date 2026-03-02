// LoginMenus.tsx
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { createPortal } from "react-dom";
import "./LoginMenus.css";

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
  placeholder = "",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
  placeholder?: string;
}) {
  const [showPassword, setShowPassword] = useState(false);

  // When label is empty, we assume the parent already provides dp-field + dp-label
  const hasOwnField = Boolean(label);

  const content = (
    <>
      {label ? <div className="dp-label">{label}</div> : null}

      {/* FIX: make the row a positioning context */}
      <div className="dp-inputRow dp-inputRow--withIcon">
        <input
          className="dp-input dp-input--withIcon"
          type={showPassword ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          placeholder={placeholder}
          required
        />

        {/*  FIX: button is absolutely centered */}
        <button
          type="button"
          className="dp-iconBtnEye"
          onClick={() => setShowPassword((v) => !v)}
          aria-label={showPassword ? "Hide password" : "Show password"}
          title={showPassword ? "Hide password" : "Show password"}
        >
          <svg
            className="dp-eyeIcon"
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
    </>
  );

  return hasOwnField ? <div className="dp-field">{content}</div> : content;
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

        <div className="auth-actions">
          <LoginSubmitButton loading={loginLoading} />

          {/*  FIX: this must NOT be submit */}
          <button
            type="button"
            className="dp-btn dp-btn--blue"
            onClick={closeLogin}
            disabled={loginLoading}
          >
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

    if (!displayName.trim()) return setMessage("Name is required.");
    if (!email || !email.includes("@"))
      return setMessage("Please enter a valid email address.");
    if (!usernameNorm) return setMessage("Username is required.");
    if (!isValidUsername(usernameNorm))
      return setMessage(" 3–20 chars with letters, numbers, underscore.");
    if (!password || password.length < 8)
      return setMessage("Password must be at least 8 characters.");
    if (password !== confirm) return setMessage("Passwords do not match.");

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("username", usernameNorm)
        .maybeSingle();

      if (error) {
        console.error("[signup] username availability check failed", {
          username: usernameNorm,
          error: Error,
        });
        setMessage("Could not verify username. Please try again.");
        return;
      }

      if (data) {
        setMessage("That username is already taken.");
        return;
      }

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

      if (!userId) {
        // This can happen if email confirmation is required and no user object is returned.
        setMessage(
          "Account created. Please check your email to confirm, then sign in.",
        );
        return;
      }

      const { error: profileErr } = await supabase.from("profiles").insert({
        user_id: userId,
        username: usernameNorm,
        display_name: displayName.trim(),
        email,
      });

      if (profileErr) {
        console.error("[signup] profile creation failed", {
          username: usernameNorm,
          error: profileErr,
        });

        setMessage(
          "Account created, but profile setup failed. Please contact support.",
        );
        return;
      }

      await supabase.auth.signOut();
      setMessage("Account created! Now press Sign in.");
      closeSignup();
    } catch (err) {
      console.error("[signup] failed:", err);
      setMessage("Signup failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="dp-form">
      <div className="dp-field">
        <div className="dp-label">Name</div>
        <input
          className="dp-input"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          autoComplete="name"
          placeholder="Your display name"
          required
        />
      </div>

      <div className="dp-field">
        <div className="dp-label">Username</div>
        <input
          className="dp-input"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          placeholder="3–20 chars"
          required
        />
        <div className="auth-hint">
          3–20 chars with letters, numbers, and underscore.
        </div>
      </div>

      <div className="dp-field">
        <div className="dp-label">Email</div>
        <input
          className="dp-input"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          autoComplete="email"
          inputMode="email"
          placeholder=""
          required
        />
      </div>

      {/*  Password */}
      <div className="dp-field">
        <div className="dp-label">Password</div>
        <PasswordField
          label=""
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          placeholder="At least 8 characters"
        />
        <div className="auth-hint">8-12+ chars</div>
      </div>

      {/*  Confirm */}
      <div className="dp-field">
        <div className="dp-label">Confirm Password</div>
        <PasswordField
          label=""
          value={confirm}
          onChange={setConfirm}
          autoComplete="new-password"
          placeholder="Repeat password"
        />
      </div>

      <div className="auth-actions auth-actions--tight">
        <button
          type="submit"
          disabled={loading}
          className="dp-btn dp-btn--yellow"
        >
          {loading ? "Creating..." : "Sign up"}
        </button>

        <button
          type="button"
          onClick={closeSignup}
          disabled={loading}
          className="dp-btn dp-btn--red dp-btn--sm"
        >
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

  const portalTarget = typeof document !== "undefined" ? document.body : null;

  function openLogin() {
    setMessage(null);
    setMode("login");
    setSignupOpen(false);
  }

  function openSignup() {
    setMessage(null);
    setIdentifier("");
    localStorage.removeItem("dp_login_identifier");
    setSignupOpen(true);
    setMode("none");
  }

  function closeLogin() {
    setMode("none");
    setMessage(null);
  }

  function closeSignup() {
    setSignupOpen(false);
  }

  const loginModal =
    mode === "login" && portalTarget
      ? createPortal(
          <div
            className="auth-modal-backdrop"
            role="presentation"
            onClick={closeLogin}
          >
            <div
              className="auth-modal neon-border"
              role="dialog"
              aria-modal="true"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="auth-modal-header">
                <h3>Sign in</h3>
                <button type="button" onClick={closeLogin} aria-label="Close">
                  X
                </button>
              </div>

              <LoginPanel
                identifier={identifier}
                setIdentifier={setIdentifier}
                message={message}
                setMessage={setMessage}
                closeLogin={closeLogin}
              />
            </div>
          </div>,
          portalTarget,
        )
      : null;

  const signupModal =
    signupOpen && portalTarget
      ? createPortal(
          <div
            className="auth-modal-backdrop"
            role="presentation"
            onClick={() => setSignupOpen(false)}
          >
            <div
              className="auth-modal signup-neon"
              role="dialog"
              aria-modal="true"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="auth-modal-header">
                <h3>Sign up</h3>
                <button
                  type="button"
                  onClick={() => setSignupOpen(false)}
                  aria-label="Close"
                >
                  X
                </button>
              </div>

              <SignupPanel
                identifier={identifier}
                setIdentifier={setIdentifier}
                message={message}
                setMessage={setMessage}
                closeSignup={closeSignup}
              />
            </div>
          </div>,
          portalTarget,
        )
      : null;

  return (
    <>
      <div className="auth-shell">
        <div className="auth-shell-top">
          <button
            type="button"
            className="auth-trigger auth-trigger--signin"
            onClick={openLogin}
          >
            Sign in
          </button>

          <button
            type="button"
            className="auth-trigger auth-trigger--signup"
            onClick={openSignup}
          >
            Sign up
          </button>
        </div>

        {message ? <p className="auth-message">{message}</p> : null}
      </div>

      {loginModal}
      {signupModal}
    </>
  );
}
