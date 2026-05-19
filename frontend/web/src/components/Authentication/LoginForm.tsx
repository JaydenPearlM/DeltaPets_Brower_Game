import { useState } from "react";
import { DeltaLogs } from "../Devlog/logs";

type LoginFormProps = {
  identifier: string;
  password: string;
  setIdentifier: (v: string) => void;
  setPassword: (v: string) => void;
};

export function LoginForm({
  identifier,
  password,
  setIdentifier,
  setPassword,
}: LoginFormProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <>
      <div className="dp-field">
        <div className="dp-label">Username or Email</div>

        <div className="dp-inputRow auth-row-match">
          <input
            className="dp-input"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            autoComplete="username"
            required
          />

          {/* Spacer to match the eye button size */}
          <span className="auth-eyeSpacer" aria-hidden="true" />
        </div>
      </div>

      <div>
        <label>
          Password
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete=""
              placeholder=""
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
                padding: 0, // KILLS global button padding
                lineHeight: 0, // KILLS baseline drift
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
                style={{ display: "block" }} // avoids inline SVG baseline weirdness
              >
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" />
                <circle cx="12" cy="12" r="3" />
                {showPassword ? null : <path d="M3 3l18 18" />}
              </svg>
            </button>
          </div>
        </label>
      </div>
    </>
  );
}
