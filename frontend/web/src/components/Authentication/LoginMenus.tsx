import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./LoginMenus.css";
import PopupWindow from "../popup_windows/popupWindow";
import { supabase } from "@/lib/supabase/client";

type AuthView = "login" | "signup";
type ForcedAuthView = AuthView | "none";

type LoginMenusProps = {
  forcedView?: ForcedAuthView;
  showLaunchers?: boolean;
};

type AuthMessage = {
  type: "error" | "success";
  text: string;
} | null;

function PasswordField({
  label,
  value,
  onChange,
  autoComplete,
  placeholder = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  placeholder?: string;
}) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="dp-field">
      <label className="dp-label">{label}</label>

      <div className="dp-inputRow dp-inputRow--withIcon">
        <input
          className="dp-input dp-input--withIcon"
          type={showPassword ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          placeholder={placeholder}
          required
        />

        <button
          type="button"
          className="dp-iconBtnEye"
          onClick={() => setShowPassword((current) => !current)}
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
    </div>
  );
}

function normalizeNickname(raw: string) {
  return raw.trim().toLowerCase();
}

function isValidNickname(value: string) {
  return /^[a-z0-9_]{3,20}$/.test(value);
}

export function LoginMenus({
  forcedView = "none",
  showLaunchers = true,
}: LoginMenusProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<AuthView>("login");
  const [message, setMessage] = useState<AuthMessage>(null);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  const [email, setEmail] = useState(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("dp_login_identifier") ?? "";
  });

  const [loginPassword, setLoginPassword] = useState("");

  const [name, setName] = useState("");
  const [nickname, setNickname] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("dp_login_identifier", email);
  }, [email]);

  function openLogin() {
    setMessage(null);
    setView("login");
    setIsOpen(true);
  }

  function openSignup() {
    setMessage(null);
    setView("signup");
    setIsOpen(true);
  }

  function resetSignupFields() {
    setName("");
    setNickname("");
    setSignupPassword("");
    setConfirmPassword("");
  }

  function closeModal() {
    setIsOpen(false);
    setMessage(null);
    setLoading(false);
    setLoginPassword("");

    if (location.pathname === "/signup" || location.pathname === "/signin") {
      navigate("/", { replace: true });
    }
  }

  useEffect(() => {
    const handleOpenLogin = () => {
      openLogin();
    };

    const handleOpenSignup = () => {
      openSignup();
    };

    window.addEventListener("deltapets:open-login", handleOpenLogin);
    window.addEventListener("deltapets:open-signup", handleOpenSignup);

    return () => {
      window.removeEventListener("deltapets:open-login", handleOpenLogin);
      window.removeEventListener("deltapets:open-signup", handleOpenSignup);
    };
  }, []);

  useEffect(() => {
    if (forcedView === "none") return;

    setMessage(null);
    setView(forcedView);
    setIsOpen(true);
  }, [forcedView]);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeModal();
      }
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen]);

  async function handleLoginSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail || !loginPassword.trim()) {
      setMessage({
        type: "error",
        text: "Email and password are required.",
      });
      return;
    }

    setLoading(true);
    console.log("[auth] sign-in request started");

    try {
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password: loginPassword,
      });

      if (error) {
        setMessage({
          type: "error",
          text: error.message ?? "Sign in failed.",
        });
        return;
      }

      const userId = authData.user?.id;

      if (!userId) {
        setMessage({
          type: "error",
          text: "Sign in succeeded, but no user was returned.",
        });
        return;
      }

      console.log("[auth] sign-in success userId=%s", userId);

      const { data: existingPet, error: petLookupError } = await supabase
        .from("pets")
        .select("id")
        .eq("user_id", userId)
        .limit(1)
        .maybeSingle();

      if (petLookupError) {
        console.error("[auth] pet lookup failed:", petLookupError);
        closeModal();
        console.log("[auth] routing -> /pet (pet lookup fallback)");
        navigate("/pet");
        return;
      }

      closeModal();

      if (existingPet) {
        console.log("[auth] pet lookup -> existing pet found");
        console.log("[auth] routing -> /pet");
        navigate("/pet");
      } else {
        console.log("[auth] pet lookup -> no pet found");
        console.log("[auth] routing -> /create");
        navigate("/create");
      }
    } catch (error) {
      console.error("[auth] sign-in failed:", error);
      setMessage({
        type: "error",
        text: "Sign in failed. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleSignupSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const normalizedNickname = normalizeNickname(nickname);

    if (!trimmedName) {
      setMessage({
        type: "error",
        text: "Name is required.",
      });
      return;
    }

    if (trimmedName.length < 2) {
      setMessage({
        type: "error",
        text: "Name must be at least 2 characters.",
      });
      return;
    }

    if (!normalizedNickname) {
      setMessage({
        type: "error",
        text: "Nickname is required.",
      });
      return;
    }

    if (!isValidNickname(normalizedNickname)) {
      setMessage({
        type: "error",
        text: "Nickname must be 3–20 characters using letters, numbers, or underscore.",
      });
      return;
    }

    if (!trimmedEmail || !trimmedEmail.includes("@")) {
      setMessage({
        type: "error",
        text: "Please enter a valid email address.",
      });
      return;
    }

    if (!signupPassword || signupPassword.length < 8) {
      setMessage({
        type: "error",
        text: "Password must be at least 8 characters.",
      });
      return;
    }

    if (signupPassword !== confirmPassword) {
      setMessage({
        type: "error",
        text: "Passwords do not match.",
      });
      return;
    }

    setLoading(true);

    try {
      const { data: existingProfile, error: lookupError } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("username", normalizedNickname)
        .maybeSingle();

      if (lookupError) {
        console.error("[signup] nickname availability check failed", {
          nickname: normalizedNickname,
          error: lookupError,
        });

        setMessage({
          type: "error",
          text: "Could not verify nickname. Please try again.",
        });
        return;
      }

      if (existingProfile) {
        setMessage({
          type: "error",
          text: "That nickname is already taken.",
        });
        return;
      }

      const { data: signUpData, error: signUpError } =
        await supabase.auth.signUp({
          email: trimmedEmail,
          password: signupPassword,
          options: {
            data: {
              full_name: trimmedName,
              username: normalizedNickname,
              nickname: normalizedNickname,
              display_name: normalizedNickname,
            },
          },
        });

      if (signUpError) {
        setMessage({
          type: "error",
          text: signUpError.message ?? "Signup failed.",
        });
        return;
      }

      const userId = signUpData.user?.id ?? null;
      const hasSession = Boolean(signUpData.session);

      if (userId) {
      }

      if (hasSession) {
        await supabase.auth.signOut();
      }

      resetSignupFields();
      setLoginPassword("");
      closeModal();
      navigate("/");
    } catch (error) {
      console.error("[signup] failed:", error);
      setMessage({
        type: "error",
        text: "Signup failed. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  }

  const modalMarkup =
    mounted && isOpen ? (
      <PopupWindow
        isOpen={isOpen}
        onClose={closeModal}
        labelledBy="auth-modal-title"
        className={
          view === "signup" ? "auth-modal--signup" : "auth-modal--login"
        }
      >
        {view === "login" ? (
          <>
            <div className="auth-modal-header auth-modal-header--login">
              <div className="auth-modal-headerText auth-modal-headerText--loginBrand">
                <h3 id="auth-modal-title" className="auth-loginBrandTitle">
                  Welcome to{" "}
                  <span className="auth-brandDeltaPets">DeltaPets</span>.
                </h3>
              </div>
            </div>

            <form onSubmit={handleLoginSubmit} className="dp-form">
              <div className="dp-field">
                <label className="dp-label">Email</label>
                <input
                  className="dp-input"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  inputMode="email"
                  placeholder="you@example.com"
                  required
                />
              </div>

              <PasswordField
                label="Password"
                value={loginPassword}
                onChange={setLoginPassword}
                autoComplete="current-password"
                placeholder="Enter your password"
              />

              <div className="auth-actions auth-actions--bottomLeft">
                <button
                  type="submit"
                  disabled={loading}
                  className="dp-btn dp-btn--blue auth-submitButton"
                >
                  {loading ? "Signing in..." : "Sign in"}
                </button>

                <button
                  type="button"
                  className="auth-inlineClose"
                  onClick={closeModal}
                >
                  Close
                </button>
              </div>
            </form>
          </>
        ) : (
          <>
            <div className="auth-signupBrandBlock">
              <p className="auth-signupIntro">
                Start your Journey into{" "}
                <span className="auth-brandAliune">Aliune</span>!
              </p>

              <h3 id="auth-modal-title" className="auth-signupTitle">
                Create your{" "}
                <span className="auth-brandDeltaPets">DeltaPets △</span>{" "}
                Account.
              </h3>
            </div>

            <form
              onSubmit={handleSignupSubmit}
              className="dp-form dp-form--signupCompact"
            >
              <div className="dp-field">
                <label className="dp-label">Name</label>
                <input
                  className="dp-input"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  autoComplete="name"
                  placeholder="First and Last Legal"
                  required
                />
              </div>

              <div className="dp-field">
                <label className="dp-label">Nickname</label>
                <input
                  className="dp-input"
                  value={nickname}
                  onChange={(event) => setNickname(event.target.value)}
                  autoComplete="nickname"
                  placeholder="Pick a unique Nickname"
                  required
                />
                <div className="auth-hint"></div>
              </div>

              <div className="dp-field">
                <label className="dp-label">Email</label>
                <input
                  className="dp-input"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  inputMode="email"
                  placeholder="you@example.com"
                  required
                />
              </div>

              <PasswordField
                label="Password"
                value={signupPassword}
                onChange={setSignupPassword}
                autoComplete="new-password"
                placeholder="At least 8 characters"
              />

              <PasswordField
                label="Confirm Password"
                value={confirmPassword}
                onChange={setConfirmPassword}
                autoComplete="new-password"
                placeholder="Repeat password"
              />

              <div className="auth-actions auth-actions--bottomLeft auth-actions--signup">
                <button
                  type="submit"
                  disabled={loading}
                  className="dp-btn dp-btn--blue auth-submitButton"
                >
                  {loading ? "Signing up..." : "Sign Up"}
                </button>

                <button
                  type="button"
                  className="auth-inlineClose"
                  onClick={closeModal}
                >
                  Close
                </button>
              </div>
            </form>
          </>
        )}

        {message ? (
          <p
            className={`auth-message ${
              message.type === "error"
                ? "auth-message--error"
                : "auth-message--success"
            }`}
          >
            {message.text}
          </p>
        ) : null}
      </PopupWindow>
    ) : null;

  return (
    <>
      {showLaunchers ? (
        <div className="auth-launchers">
          <button
            type="button"
            className="dp-btn dp-btn--blue"
            onClick={openLogin}
          >
            Sign in
          </button>

          <button
            type="button"
            className="dp-btn dp-btn--blue"
            onClick={openSignup}
          >
            Sign up
          </button>
        </div>
      ) : null}

      {modalMarkup}
    </>
  );
}
