import { createBrowserRouter } from "react-router-dom";
import App from "../App";
import Homepage from "../../pages/homepage";
import PetPage from "../../Pets_Design/auth/pets/pages/Petspage_1/PetPage";
import CreatePage from "../../pages/create";
import AuthCallback from "./AuthCallback";
import HatcheryPage from "../../components/Hatchery/pages/HatcheryPage";
import PetHomePage from "../../pages/PetHomePage";
import Gym from "../../pages/gym";
import InventoryPage from "../../pages/inventory";

function NotFound() {
  return <div style={{ padding: 16 }}>404 — Page not found</div>;
}

export const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <Homepage /> },

      // ✅ support the redirect you set in SignupForm
      { path: "auth/callback", element: <AuthCallback /> },

      // ✅ keep your old route as an alias (optional, but nice)
      { path: "authcallback", element: <AuthCallback /> },

      { path: "create", element: <CreatePage /> },
      { path: "pet", element: <PetPage /> },

      //Hatchery
      { path: "hatchery", element: <HatcheryPage /> },
      { path: "secretHaven", element: <PetHomePage /> },

      { path: "gym", element: <Gym /> },
      { path: "inventory", element: <InventoryPage /> },
    ],
  },
  { path: "*", element: <NotFound /> },
]);
