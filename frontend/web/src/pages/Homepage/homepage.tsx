import { useAuth } from "@/app/providers/useAuth";
import { LoginMenus } from "@/components/Authentication/LoginMenus";
import { LogoutButton } from "@/components/Authentication/LogoutButton";
import "./homepage.css";

export default function Homepage() {
  const auth = useAuth();

  return (
    <div className="homepage">
      {/* 
        Homepage should NEVER auto-redirect.
        It is a decision point, not a router.
      */}

      {/* Logged out: show login + create account */}
      {!auth.user ? (
        <LoginMenus />
      ) : (
        // Logged in: show NO "Enter Game" button — just a safe logout option
        <div
          className="homepage-panel"
          style={{ marginTop: 18, maxWidth: 520 }}
        >
          <p className="homepage-user" style={{ margin: 0, opacity: 0.85 }}>
            Logged in as <strong>{auth.user.email}</strong>
          </p>

          <div className="button-row" style={{ marginTop: 12 }}>
            <LogoutButton />
          </div>
        </div>
      )}
    </div>
  );
}
