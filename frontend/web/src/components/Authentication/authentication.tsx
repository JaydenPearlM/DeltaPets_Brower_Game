import { useState } from "react";
import { LoginForm } from "./LoginForm";
import { SignupForm } from "./SignupForm";
import "./authentication.css";

type AuthMode = "login" | "signup";

type AuthenticationProps = {
  onMessage?: (msg: string | null) => void;
};

export function Authentication({ onMessage }: AuthenticationProps) {
  const [mode, setMode] = useState<AuthMode>("login");

  return (
    <div className="auth-root">
      <div className="auth-stack">
        <div className="button-row">
          <button
            type="button"
            onClick={() => setMode("signup")}
            aria-pressed={mode === "signup"}
          >
            Create Account
          </button>
          <button
            type="button"
            onClick={() => setMode("login")}
            aria-pressed={mode === "login"}
          >
            Login
          </button>
        </div>

        {mode === "login" ? (
          <LoginForm onMessage={onMessage} />
        ) : (
          <SignupForm onMessage={onMessage} />
        )}
      </div>
    </div>
  );
}
