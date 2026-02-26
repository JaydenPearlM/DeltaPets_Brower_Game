import { useEffect } from "react";
import { useAuth } from "@/app/providers/useAuth";
import { LoginMenus } from "@/components/Authentication/LoginMenus";
import { LogoutButton } from "@/components/Authentication/LogoutButton";
import { StageLogo } from "@/components/stage_Logo";
import { CareRoom } from "@/pages/petsPage/components/petHomeComponents/careRoom";

import { AnnouncementsPanel } from "@/components/Announcments/AnnouncementPanel";
import "./homepage.css";

export default function Homepage() {
  const auth = useAuth();

  useEffect(() => {
    document.body.classList.add("dp-homepage");
    return () => document.body.classList.remove("dp-homepage");
  }, []);

  return (
    <section className="home2col">
      {/* LEFT COLUMN */}
      <aside className="homeLeft">
        {/* ✅ Announcements (NotebookPaper component + Supabase hook) */}
        <AnnouncementsPanel minHeight={260} />

        {/* LoginMenus UNDER announcements (separate block) */}
        {!auth.user ? (
          <section className="homeLoginBelow surface">
            <div className="homeLoginTitle">Login / Create Account</div>
            <LoginMenus />
          </section>
        ) : (
          <section className="homeLoginBelow surface homeLoggedInBox">
            <div className="homeQuickUser">
              Logged in as <strong>{auth.user.email}</strong>
            </div>
            <LogoutButton />
          </section>
        )}
      </aside>

      {/* RIGHT COLUMN */}
      <main className="homeRight">
        {/* Hero stays in RIGHT column */}
        <div className="homeHeroRight">
          <StageLogo size="lg" align="right" />
        </div>

        {/* CareRoom stays in RIGHT column */}
        <section className="homeCarePlain">
          <h2 className="homePanelTitle"></h2>

          <div className="homeCareInner">
            <CareRoom mode={auth.user ? "auth" : "preview"} />
          </div>

          {!auth.user && <div className="homeNote"></div>}
        </section>
      </main>
    </section>
  );
}
