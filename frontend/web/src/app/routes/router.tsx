import { createBrowserRouter } from "react-router-dom";
import App from "../App";
import Homepage from "../../NaviPages/homepage";
import PetPage from "../../features/auth/pets/pages/PetPage1/PetPage";

function CreatePlaceholder() {
  return <div style={{ padding: 16 }}>Character creation placeholder</div>;
}

function NotFound() {
  return <div style={{ padding: 16 }}>404 — Page not found</div>;
}

export const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <Homepage /> },

      // placeholders for now
      { path: "create", element: <CreatePlaceholder /> },

      // ✅ real pet page route
      { path: "pet", element: <PetPage /> },
    ],
  },
  { path: "*", element: <NotFound /> },
]);
