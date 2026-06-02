import React, { Suspense } from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { router } from "./app/routes/router";
import { AppProviders } from "./app/providers/AppProviders";
import { ErrorBoundary } from "./app/ErrorBoundary";
import "./global.css";

const DebugOverlay = import.meta.env.DEV
  ? React.lazy(() =>
      import("./app/DebugOverlay").then((module) => ({
        default: module.DebugOverlay,
      })),
    )
  : null;

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AppProviders>
        <RouterProvider router={router} />
        {DebugOverlay ? (
          <Suspense fallback={null}>
            <DebugOverlay />
          </Suspense>
        ) : null}
      </AppProviders>
    </ErrorBoundary>
  </React.StrictMode>,
);
