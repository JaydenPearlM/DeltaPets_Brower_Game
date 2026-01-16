import React from "react";
import { RouterProvider } from "react-router-dom";
import { router } from "./routes/router";
import { DevBanner } from "../components/DevBanner";

export default function App() {
  return (
    <div className="game-shell">
      <div className="game-canvas">
        <div className="ui-layer">
          <DevBanner />
        </div>

        <RouterProvider router={router} />
      </div>
    </div>
  );
}
