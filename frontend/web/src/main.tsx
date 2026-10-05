import React from "react";
import ReactDOM from "react-dom/client";
import { ErrorBoundary } from "./app/ErrorBoundary";
import "./global.css";
import "./mobile.css";

const isResonancePreview = import.meta.env.DEV &&
  window.location.pathname === "/resonance-preview";

const ResonancePreview = import.meta.env.DEV
  ? React.lazy(() => import("./preview_testing/resonanceEvolution/ResonanceEvolutionPreview"))
  : null;

// Load gameplay modules only when opening the game, never for the isolated preview.
const GameApplication = React.lazy(async () => {
  const [{ RouterProvider }, { router }, { AppProviders }] = await Promise.all([
    import("react-router-dom"),
    import("./app/routes/router"),
    import("./app/providers/AppProviders"),
  ]);
  return {
    default: function GameApplicationRoot() {
      return <AppProviders><RouterProvider router={router} /></AppProviders>;
    },
  };
});

const authHash = new URLSearchParams(
  window.location.hash.startsWith("#")
    ? window.location.hash.slice(1)
    : window.location.hash,
);

if (
  !isResonancePreview &&
  authHash.get("type") === "signup" &&
  authHash.has("access_token") &&
  window.location.pathname !== "/authcallback"
) {
  window.history.replaceState(
    {},
    document.title,
    `/authcallback${window.location.hash}`,
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <React.Suspense fallback={<div style={{ padding: 16 }}>Loading...</div>}>
        {isResonancePreview && ResonancePreview
          ? <ResonancePreview />
          : <GameApplication />}
      </React.Suspense>
    </ErrorBoundary>
  </React.StrictMode>,
);
