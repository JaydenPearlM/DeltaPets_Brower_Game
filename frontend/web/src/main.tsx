import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { router } from "./app/routes/router";
import { AppProviders } from "./app/providers/AppProviders";
import { ErrorBoundary } from "./app/ErrorBoundary";
import "./global.css";
import "./mobile.css";

const authHash = new URLSearchParams(
  window.location.hash.startsWith("#")
    ? window.location.hash.slice(1)
    : window.location.hash,
);

if (
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
      <AppProviders>
        <RouterProvider router={router} />
      </AppProviders>
    </ErrorBoundary>
  </React.StrictMode>,
);
