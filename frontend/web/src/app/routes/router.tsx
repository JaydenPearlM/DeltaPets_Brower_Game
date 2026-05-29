import { createBrowserRouter } from "react-router-dom";
import App from "../App";
import Homepage from "../../pages/Homepage/homepage";
import CreatePage from "../../pages/cutscene/create";

import PetPage from "../../pages/petsPage/PetPage";
import AuthCallback from "./AuthCallback";
import HatcheryPage from "../../components/Hatchery/pages/HatcheryPage";
import { ComingSoonPage } from "../../pages/Soon/ComingSoonPage";

function NotFound() {
  return <div style={{ padding: 16 }}>404 — Page not found</div>;
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

      { path: "farm", element: <ComingSoonPage pageName="Pet Farm" /> },
      { path: "gym", element: <ComingSoonPage pageName="Gym" /> },
      {
        path: "battle-arena",
        element: <ComingSoonPage pageName="Battle Arena" />,
      },
      {
        path: "battle-dungeons",
        element: <ComingSoonPage pageName="Battle Dungeons" />,
      },
      { path: "cities", element: <ComingSoonPage pageName="Cities" /> },
      { path: "profile", element: <ComingSoonPage pageName="Profiles" /> },

      { path: "cities/kithna", element: <ComingSoonPage pageName="Kithna" /> },
      { path: "cities/kath", element: <ComingSoonPage pageName="Kath" /> },
    ],
  },

  { path: "*", element: <NotFound /> },
]);
