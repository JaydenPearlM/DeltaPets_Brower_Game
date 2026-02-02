import { useEffect, useState } from "react";
import { LoginButton } from "./LoginButton";
import { SignupButton } from "./SignupButton";
import { LoginForm } from "./LoginForm";
import { SignupForm } from "./SignupForm";
import { LoginSubmitButton } from "./LoginSubmitButton";
import { useLoginSubmit } from "./LoginSubmit";
import { TurnstileWidget } from "./TurnstileWidget";

type Mode = "none" | "login";

const AUTO_CLOSE_MS = 2 * 60 * 1000; // 2 minutes

type LoginPanelProps = {
  identifier: string;
  setIdentifier: (v: string) => void;
  message: string | null;
  setMessage: (v: string | null) => void;
  closeLogin: () => void;
};

function LoginPanel({
  identifier,
  setIdentifier,
  message,
  setMessage,
  closeLogin,
}: LoginPanelProps) {
  const [password, setPassword] = useState("");
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  // optional in Alpha — one line to avoid parser weirdness
  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined;

  const { loading: loginLoading, handleSubmit: handleLoginSubmit } =
    useLoginSubmit({
      identifier,
      password,
      captchaToken,
      onMessage: setMessage,
      onAfterAttempt: () => setCaptchaToken(null),
    });

  // Auto-close after 2 minutes while panel is mounted (i.e., mode === "login")
  useEffect(() => {
    const t = window.setTimeout(() => {
      setMessage(null);
      setPassword("");
      setCaptchaToken(null);
      closeLogin();
    }, AUTO_CLOSE_MS);

    return () => window.clearTimeout(t);
  }, [closeLogin, setMessage]);

  // When the panel mounts, clear any old state
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
          <button type="button" onClick={closeLogin} disabled={loginLoading}>
            Close
          </button>
        </div>
      </form>

      {message ? <p className="auth-message">{message}</p> : null}

      <p style={{ fontSize: 12, opacity: 0.8 }}>
        This menu will auto-close in 2 minutes.
      </p>
    </div>
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
  }

  return (
    <div className="auth-shell">
      <div className="auth-shell-top">
        <LoginButton onClick={openLogin} />
        <SignupButton onClick={openSignup} />
      </div>

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
