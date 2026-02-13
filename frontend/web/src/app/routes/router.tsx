// frontend/web/src/app/routes/router.tsx
import { createBrowserRouter, Navigate } from "react-router-dom";
import App from "../App";

import Homepage from "../../pages/homepage";
import CreatePage from "../../pages/create";
import Gym from "../../pages/gym";
import InventoryPage from "../../pages/inventory";
import PetHomePage from "../../pages/PetHome_SecretHaven/PetHomePage";

import PetPage from "../../Pets_Design/auth/pets/pages/Petspage_1/PetPage";
import AuthCallback from "./AuthCallback";
import HatcheryPage from "../../components/Hatchery/pages/HatcheryPage";

function NotFound() {
  return <div style={{ padding: 16 }}>404 — Page not found</div>;
}

export const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      // Home
      { index: true, element: <Homepage /> },
      { path: "home", element: <Homepage /> },

      // Auth callbacks
      { path: "auth/callback", element: <AuthCallback /> },
      { path: "authcallback", element: <AuthCallback /> },

      // Core pages
      { path: "create", element: <CreatePage /> },
      { path: "pet", element: <PetPage /> },

      // Hatchery
      { path: "hatchery", element: <HatcheryPage /> },

      // Secret Haven (Bond Room)
      { path: "secretHaven", element: <PetHomePage /> },

      // Alias redirect (old links)
      { path: "petHome", element: <Navigate to="/secretHaven" replace /> },

      // Other pages
      { path: "gym", element: <Gym /> },
      { path: "inventory", element: <InventoryPage /> },
    ],
  },

  // 404
  { path: "*", element: <NotFound /> },
]);
