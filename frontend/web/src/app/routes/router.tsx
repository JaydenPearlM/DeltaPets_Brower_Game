import { createBrowserRouter, Navigate } from "react-router-dom";
import App from "../App";
import Homepage from "../../pages/Homepage/homepage";
import CreatePage from "../../pages/cutscene/create";
import Gym from "../../pages/gym/gym";
import InventoryPage from "../../components/inventory/inventory";
import PetPage from "../../pages/petsPage/PetPage";
import AuthCallback from "./AuthCallback";
import HatcheryPage from "../../components/Hatchery/pages/HatcheryPage";

// FIX: correct import + correct component name casing
import PetBondHome from "../../pages/PetHome_SecretHaven/petBondComponents/petBondHome";

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

      { path: "signup", element: <Homepage /> },
      { path: "signin", element: <Homepage /> },

      // Auth callbacks
      { path: "authcallback", element: <AuthCallback /> },

      // Core pages
      { path: "create", element: <CreatePage /> },
      { path: "pet", element: <PetPage /> },

      // Hatchery
      { path: "hatchery", element: <HatcheryPage /> },

      // Secret Haven (Bond Room ONLY)
      { path: "secretHaven", element: <PetBondHome /> },

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
