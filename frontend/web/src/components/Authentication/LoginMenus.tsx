import { useEffect, useState } from "react";
import { LoginButton } from "./LoginButton";
import { SignupButton } from "./SignupButton";
import { LoginForm } from "./LoginForm";
import { SignupForm } from "./SignupForm";
import { LoginSubmitButton } from "./LoginSubmitButton";
import { useLoginSubmit } from "./LoginSubmit";
import { TurnstileWidget } from "./TurnstileWidget";
import "./authentication.css";

type Mode = "none" | "login";

const AUTO_CLOSE_MS = 2 * 60 * 1000; // 2 minutes

export function LoginMenus() {
  const [mode, setMode] = useState<Mode>("none");
  const [signupOpen, setSignupOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [identifier, setIdentifier] = useState(() => {
    return localStorage.getItem("dp_login_identifier") ?? "";
  });
  const [password, setPassword] = useState("");
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  // ✅ optional in Alpha — one line to avoid parser weirdness
  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined;

  useEffect(() => {
    localStorage.setItem("dp_login_identifier", identifier);
  }, [identifier]);

  const { loading: loginLoading, handleSubmit: handleLoginSubmit } =
    useLoginSubmit({
      identifier,
      password,
      captchaToken,
      onMessage: setMessage,
      onAfterAttempt: () => setCaptchaToken(null),
    });

  useEffect(() => {
    if (mode !== "login") return;

    const t = window.setTimeout(() => {
      setMode("none");
      setMessage(null);
      setPassword("");
      setCaptchaToken(null);
    }, AUTO_CLOSE_MS);

    return () => window.clearTimeout(t);
  }, [mode]);

  function openLogin() {
    setMessage(null);
    setMode("login");
    setSignupOpen(false);
    setPassword("");
    setCaptchaToken(null);
  }

  function openSignup() {
    setMessage(null);
    setSignupOpen(true);
    setMode("none");
    setCaptchaToken(null);
  }

  function closeLogin() {
    setMode("none");
    setMessage(null);
    setPassword("");
    setCaptchaToken(null);
  }

  function closeSignup() {
    setSignupOpen(false);
  }

  return (
    <div className="auth-shell">
      <div className="auth-shell-top">
        <LoginButton onClick={openLogin} />
        <SignupButton onClick={openSignup} />
      </div>

      {mode === "login" && (
        <div className="auth-shell-panel">
          <form onSubmit={handleLoginSubmit}>
            <LoginForm
              identifier={identifier}
              password={password}
              setIdentifier={setIdentifier}
              setPassword={setPassword}
            />

            {siteKey && (
              <div style={{ marginTop: 12 }}>
                <TurnstileWidget
                  siteKey={siteKey}
                  onToken={(t) => setCaptchaToken(t)}
                />
              </div>
            )}

            <div className="login-actions" style={{ marginTop: 12 }}>
              <LoginSubmitButton loading={loginLoading} />
              <button
                type="button"
                onClick={closeLogin}
                disabled={loginLoading}
              >
                Close
              </button>
            </div>
          </form>

          {message ? <p className="auth-message">{message}</p> : null}

          <p style={{ fontSize: 12, opacity: 0.8 }}>
            This menu will auto-close in 2 minutes.
          </p>
        </div>
      )}

      {signupOpen && (
        <div
          className="auth-modal-backdrop"
          role="presentation"
          onClick={closeSignup}
        >
          <div
            className="auth-modal"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="auth-modal-header">
              <h3>Create Account</h3>
              <button type="button" onClick={closeSignup}>
                X
              </button>
            </div>

            <SignupForm
              onSuccess={() => setSignupOpen(false)}
              onMessage={setMessage}
            />

            {message ? <p className="auth-message">{message}</p> : null}
          </div>
        </div>
      )}
    </div>
  );
}
