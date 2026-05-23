import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { router } from "./app/routes/router";
import { AppProviders } from "./app/providers/AppProviders";
import { ErrorBoundary } from "./app/ErrorBoundary";
import "./global.css";
import { DebugOverlay } from "./app/DebugOverlay";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AppProviders>
        <RouterProvider router={router} />
        {import.meta.env.DEV ? <DebugOverlay /> : null}
      </AppProviders>
    </ErrorBoundary>
  </React.StrictMode>,
);
