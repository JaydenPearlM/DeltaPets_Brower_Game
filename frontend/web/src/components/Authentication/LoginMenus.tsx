import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import "./LoginMenus.css";

import { LoginForm } from "./LoginForm";
import { LoginSubmitButton } from "./LoginSubmitButton";
import { useLoginSubmit } from "./LoginSubmit";
import { supabase } from "../../lib/supabase/client";

type Mode = "none" | "login";
type ForcedView = "none" | "login" | "signup";

const AUTO_CLOSE_MS = 2 * 60 * 1000;

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

  const hasOwnField = Boolean(label);

  const content = (
    <>
      {label ? <div className="dp-label">{label}</div> : null}

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

          <button
            type="button"
            className="dp-btn dp-btn--red"
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
      setMessage("3–20 chars with letters, numbers, underscore.");
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
      const { data: existingProfile, error: lookupError } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("username", usernameNorm)
        .maybeSingle();

      if (lookupError) {
        console.error("[signup] username availability check failed", {
          username: usernameNorm,
          error: lookupError,
        });
        setMessage("Could not verify username. Please try again.");
        return;
      }

      if (existingProfile) {
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
      const hasSession = Boolean(signUpData.session);

      if (!userId) {
        setMessage(
          "Account created. Please check your email to confirm, then sign in.",
        );
        return;
      }

      const { error: profileErr } = await supabase.from("profiles").upsert(
        {
          user_id: userId,
          username: usernameNorm,
          display_name: displayName.trim(),
          email,
        },
        { onConflict: "user_id" },
      );

      if (profileErr) {
        console.error("[signup] profile upsert failed", {
          username: usernameNorm,
          userId,
          error: profileErr,
        });
        setMessage(
          "Account created, but profile setup failed. Please contact support.",
        );
        return;
      }

      if (hasSession) {
        await supabase.auth.signOut();
      }

      setIdentifier(email);
      closeSignup();
      setMessage("Account created successfully. Please sign in.");
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
          className="dp-btn dp-btn--blue"
        >
          {loading ? "Creating..." : "Sign up"}
        </button>

        <button
          type="button"
          onClick={closeSignup}
          disabled={loading}
          className="dp-btn dp-btn--red"
        >
          Close
        </button>
      </div>

      {message ? <p className="auth-message">{message}</p> : null}
    </form>
  );
}

export function LoginMenus({
  forcedView = "none",
}: {
  forcedView?: ForcedView;
}) {
  const navigate = useNavigate();
  const location = useLocation();

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

  useEffect(() => {
    const pathname = location.pathname;

    if (forcedView === "signup" || pathname === "/signup") {
      setMode("none");
      setSignupOpen(true);
      return;
    }

    if (forcedView === "login" || pathname === "/signin") {
      setSignupOpen(false);
      setMode("login");
      return;
    }

    setSignupOpen(false);
    setMode("none");
  }, [forcedView, location.pathname, location.search]);

  function openLogin() {
    setMessage(null);
    setMode("login");
    setSignupOpen(false);
    navigate(`/signin?open=${Date.now()}`);
  }

  function openSignup() {
    setMessage(null);
    setIdentifier("");
    localStorage.removeItem("dp_login_identifier");
    setSignupOpen(true);
    setMode("none");
    navigate(`/signup?open=${Date.now()}`);
  }

  function closeLogin() {
    setMode("none");
    setMessage(null);

    if (location.pathname === "/signin" || location.pathname === "/signup") {
      navigate("/", { replace: true });
    }
  }

  function closeSignup() {
    setSignupOpen(false);
    setMessage(null);

    if (location.pathname === "/signin" || location.pathname === "/signup") {
      navigate("/", { replace: true });
    }
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
              aria-label="Sign in"
              onClick={(e) => e.stopPropagation()}
            >
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
            onClick={closeSignup}
          >
            <div
              className="auth-modal signup-neon"
              role="dialog"
              aria-modal="true"
              aria-label="Sign up"
              onClick={(e) => e.stopPropagation()}
            >
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
      <div className="auth-launchers" style={{ display: "flex", gap: "12px" }}>
        <button className="dp-btn dp-btn--yellow" onClick={openLogin}>
          Sign in
        </button>
        <button className="dp-btn dp-btn--blue" onClick={openSignup}>
          Sign up
        </button>
      </div>

      {loginModal}
      {signupModal}
    </>
  );
}
