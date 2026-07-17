import { lazy, Suspense } from "react";
import { createBrowserRouter, Navigate, useLocation } from "react-router-dom";
import App from "../App";
import { useAuth } from "../providers/useAuth";
import AuthCallback from "./AuthCallback";
import { AlphaAccessGate } from "../../components/AlphaAccess_temp/AlphaAccessGate";
const ParkPage = lazy(() => import("../../pages/park/park"));
const KithnaMap = lazy(() => import("../../pages/Cities/Kithna/KithnaMap"));
const Homepage = lazy(() => import("../../pages/Homepage/homepage"));
const CreatePage = lazy(() => import("../../pages/cutscene/create"));
const RescueEggReveal = lazy(
  () => import("../../pages/cutscene/rescueEggReveal"),
);
const PetPage = lazy(() => import("../../pages/petsPage/PetPage"));
const FarmPage = lazy(() => import("../../pages/farm/petFarmFood"));
const HatcheryPage = lazy(
  () => import("../../components/Hatchery/pages/HatcheryPage"),
);

const ProfilePage = lazy(() => import("../../pages/profile/ProfilePage"));
const BattleArenaPage = lazy(
  () => import("../../pages/battleArena/BattleArenaPage"),
);
const BattleDungeonsPage = lazy(
  () => import("../../pages/battleDungeons/BattleDungeonsPage"),
);
const GymPage = lazy(() => import("../../pages/gym/gym"));

const ComingSoonPage = lazy(() =>
  import("../../pages/Soon/ComingSoonPage").then((module) => ({
    default: module.ComingSoonPage,
  })),
);

const FoodMerchantPage = lazy(
  () => import("../../pages/Cities/Kithna/Merchants/FoodMerchantPage"),
);
const MerchantClosedPage = lazy(
  () => import("../../pages/Cities/Kithna/Merchants/MerchantClosedPage"),
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
    element: (
      <AlphaAccessGate>
        <App />
      </AlphaAccessGate>
    ),
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
        path: "rescue-reveal",
        element: withSuspense(
          <ProtectedRoute>
            <RescueEggReveal />
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
            <FarmPage />
          </ProtectedRoute>,
        ),
      },
      {
        path: "gym",
        element: withSuspense(
          <ProtectedRoute>
            <GymPage />
          </ProtectedRoute>,
        ),
      },
      {
        path: "battle-arena",
        element: withSuspense(
          <ProtectedRoute>
            <BattleArenaPage />
          </ProtectedRoute>,
        ),
      },
      {
        path: "battle-dungeons",
        element: withSuspense(
          <ProtectedRoute>
            <BattleDungeonsPage />
          </ProtectedRoute>,
        ),
      },
      {
        path: "park",
        element: withSuspense(
          <ProtectedRoute>
            <ParkPage />
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
            <ProfilePage />
          </ProtectedRoute>,
        ),
      },

      {
        path: "cities/kithna",
        element: withSuspense(
          <ProtectedRoute>
            <KithnaMap />
          </ProtectedRoute>,
        ),
      },
      {
        path: "kithna/food",
        element: withSuspense(
          <ProtectedRoute>
            <FoodMerchantPage />
          </ProtectedRoute>,
        ),
      },
      {
        path: "kithna/health",
        element: withSuspense(
          <ProtectedRoute>
            <MerchantClosedPage merchantName="Health Merchant" />
          </ProtectedRoute>,
        ),
      },
      {
        path: "kithna/armor",
        element: withSuspense(
          <ProtectedRoute>
            <MerchantClosedPage merchantName="Armor Merchant" />
          </ProtectedRoute>,
        ),
      },
      {
        path: "kithna/weapons",
        element: withSuspense(
          <ProtectedRoute>
            <MerchantClosedPage merchantName="Weapon Merchant" />
          </ProtectedRoute>,
        ),
      },
    ],
  },

  { path: "*", element: <NotFound /> },
]);
