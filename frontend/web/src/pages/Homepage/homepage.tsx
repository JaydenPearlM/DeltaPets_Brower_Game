import { useAuth } from "@/app/providers/useAuth";
import { LoginMenus } from "@/components/Authentication/LoginMenus";
import { LogoutButton } from "@/components/Authentication/LogoutButton";
import { StageLogo } from "@/components/stage_Logo";
import "./homepage.css";

export default function Homepage() {
  const auth = useAuth();

  return (
    <section className="homepage">
      <div className="homepage-hero">
        <StageLogo size="lg" align="right" />
      </div>

      {!auth.user ? (
        <LoginMenus />
      ) : (
        <div className="homepage-panel surface">
          <p className="homepage-user">
            Logged in as <strong>{auth.user.email}</strong>
          </p>

          <div className="button-row">
            <LogoutButton />
          </div>
        </div>
      )}
    </section>
  );
}
