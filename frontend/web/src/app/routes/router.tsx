import { createBrowserRouter } from "react-router-dom";
import RequireAuth from "./RequireAuth";
// Optional: a simple not-found page
function NotFound() {
  return <div style={{ padding: 16 }}>404 — Page not found</div>;
}

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/",
    element: (
      <RequireAuth>
        <PetPage />
      </RequireAuth>
    ),
  },
  {
    path: "*",
    element: <NotFound />,
  },
]);
