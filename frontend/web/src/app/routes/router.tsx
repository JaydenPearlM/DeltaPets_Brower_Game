import { createBrowserRouter } from "react-router-dom";
import App from "../App";
import Homepage from "../../pages/homepage";
import PetPage from "../../features/auth/pets/pages/Petspage_1/PetPage";
import CreatePage from "../../pages/create";
import AuthCallback from "./AuthCallback";

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
    ],
  },
  { path: "*", element: <NotFound /> },
]);
