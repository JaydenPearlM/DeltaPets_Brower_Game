import { lazy, Suspense } from "react";
import { createBrowserRouter, Navigate, useLocation } from "react-router-dom";
import App from "../App";
import { useAuth } from "../providers/useAuth";
import AuthCallback from "./AuthCallback";

const Homepage = lazy(() => import("../../pages/Homepage/homepage"));
const CreatePage = lazy(() => import("../../pages/cutscene/create"));
const PetPage = lazy(() => import("../../pages/petsPage/PetPage"));
const HatcheryPage = lazy(
  () => import("../../components/Hatchery/pages/HatcheryPage"),
);

const ComingSoonPage = lazy(() =>
  import("../../pages/Soon/ComingSoonPage").then((module) => ({
    default: module.ComingSoonPage,
  })),
);

function PageLoader() {
  return <div style={{ padding: 16 }}>Loading...</div>;
}

function withSuspense(element: React.ReactNode) {
  return <Suspense fallback={<PageLoader />}>{element}</Suspense>;
}

function NotFound() {
  return <div style={{ padding: 16 }}>404 — Page not found</div>;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <PageLoader />;
  }

  if (!user) {
    return <Navigate to="/signin" replace state={{ from: location }} />;
  }

  return <>{children}</>;
}

export const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: withSuspense(<Homepage />) },
      { path: "home", element: withSuspense(<Homepage />) },

      { path: "signup", element: withSuspense(<Homepage />) },
      { path: "signin", element: withSuspense(<Homepage />) },

      { path: "authcallback", element: <AuthCallback /> },

      {
        path: "create",
        element: withSuspense(
          <ProtectedRoute>
            <CreatePage />
          </ProtectedRoute>,
        ),
      },
      {
        path: "pet",
        element: withSuspense(
          <ProtectedRoute>
            <PetPage />
          </ProtectedRoute>,
        ),
      },
      {
        path: "hatchery",
        element: withSuspense(
          <ProtectedRoute>
            <HatcheryPage />
          </ProtectedRoute>,
        ),
      },

      {
        path: "farm",
        element: withSuspense(
          <ProtectedRoute>
            <ComingSoonPage pageName="Pet Farm" />
          </ProtectedRoute>,
        ),
      },
      {
        path: "gym",
        element: withSuspense(
          <ProtectedRoute>
            <ComingSoonPage pageName="Gym" />
          </ProtectedRoute>,
        ),
      },
      {
        path: "battle-arena",
        element: withSuspense(
          <ProtectedRoute>
            <ComingSoonPage pageName="Battle Arena" />
          </ProtectedRoute>,
        ),
      },
      {
        path: "battle-dungeons",
        element: withSuspense(
          <ProtectedRoute>
            <ComingSoonPage pageName="Battle Dungeons" />
          </ProtectedRoute>,
        ),
      },
      {
        path: "cities",
        element: withSuspense(
          <ProtectedRoute>
            <ComingSoonPage pageName="Cities" />
          </ProtectedRoute>,
        ),
      },
      {
        path: "profile",
        element: withSuspense(
          <ProtectedRoute>
            <ComingSoonPage pageName="Profiles" />
          </ProtectedRoute>,
        ),
      },

      {
        path: "cities/kithna",
        element: withSuspense(
          <ProtectedRoute>
            <ComingSoonPage pageName="Kithna" />
          </ProtectedRoute>,
        ),
      },
      {
        path: "cities/kath",
        element: withSuspense(
          <ProtectedRoute>
            <ComingSoonPage pageName="Kath" />
          </ProtectedRoute>,
        ),
      },
    ],
  },

  { path: "*", element: <NotFound /> },
]);
