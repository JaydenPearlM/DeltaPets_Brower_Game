import { createBrowserRouter, Navigate } from "react-router-dom";
import App from "../App";
import Homepage from "../../pages/Homepage/homepage";
import CreatePage from "../../pages/cutscene/create";
import Gym from "../../pages/gym/gym";
import InventoryPage from "../../components/inventory/inventory";
import PetPage from "../../pages/petsPage/PetPage";
import AuthCallback from "./AuthCallback";
import HatcheryPage from "../../components/Hatchery/pages/HatcheryPage";
import PetBondHome from "../../pages/PetHome_SecretHaven/petBondComponents/petBondHome";

function NotFound() {
  return <div style={{ padding: 16 }}>404 " " Page not found</div>;
}

function ComingSoonPage({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div
      style={{
        minHeight: "60vh",
        display: "grid",
        placeItems: "center",
        padding: "32px",
      }}
    >
      <section
        style={{
          width: "min(900px, 100%)",
          borderRadius: "24px",
          padding: "28px",
          color: "#ffffff",
          background:
            "linear-gradient(180deg, rgba(27,49,93,0.97) 0%, rgba(36,69,122,0.98) 52%, rgba(47,94,153,0.98) 100%)",
          border: "1px solid rgba(255,255,255,0.16)",
          boxShadow:
            "inset 0 1px 0 rgba(255,255,255,0.08), 0 20px 50px rgba(5,12,25,0.45)",
        }}
      >
        <p
          style={{
            margin: 0,
            fontFamily: "var(--font-heading)",
            fontSize: "1rem",
            fontWeight: 700,
            color: "#67f0d0",
          }}
        >
          Aliune Destination
        </p>

        <h1
          style={{
            margin: "8px 0 12px",
            fontFamily: "var(--font-heading)",
            fontSize: "clamp(1.8rem, 3vw, 2.4rem)",
            lineHeight: 1.1,
            color: "#ffcf61",
            WebkitTextStroke: "1px #cf4f2f",
          }}
        >
          {title}
        </h1>

        <p
          style={{
            margin: 0,
            fontFamily: "var(--font-heading)",
            fontSize: "1rem",
            lineHeight: 1.6,
            color: "rgba(255,255,255,0.92)",
          }}
        >
          {subtitle}
        </p>
      </section>
    </div>
  );
}

export const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <Homepage /> },
      { path: "home", element: <Homepage /> },

      { path: "signup", element: <Homepage /> },
      { path: "signin", element: <Homepage /> },

      { path: "authcallback", element: <AuthCallback /> },

      { path: "create", element: <CreatePage /> },
      { path: "pet", element: <PetPage /> },

      { path: "hatchery", element: <HatcheryPage /> },

      { path: "secretHaven", element: <PetBondHome /> },
      { path: "petHome", element: <Navigate to="/secretHaven" replace /> },

      { path: "gym", element: <Gym /> },
      { path: "inventory", element: <InventoryPage /> },

      {
        path: "battle-arena",
        element: (
          <ComingSoonPage
            title="Battle Arena"
            subtitle="The Arena route is now wired into your game shell. You can build the real battle screen here next."
          />
        ),
      },
      {
        path: "battle-dungeons",
        element: (
          <ComingSoonPage
            title="Battle Dungeons"
            subtitle="Battle Dungeons now has a live route instead of a dead button. This is ready for your dungeon system when you build it."
          />
        ),
      },

      {
        path: "cities/kithna",
        element: (
          <ComingSoonPage
            title="Kithna"
            subtitle="Kithna is wired as your tutorial city route. You can swap this placeholder with the real city page later."
          />
        ),
      },
      {
        path: "cities/kath",
        element: (
          <ComingSoonPage
            title="Kath"
            subtitle="Kath is now connected into the app routing. Build the actual city page here when you are ready."
          />
        ),
      },
    ],
  },

  { path: "*", element: <NotFound /> },
]);
