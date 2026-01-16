import React from "react";
import { RouterProvider } from "react-router-dom";
import { router } from "./routes/router";
import { DevBanner } from "../components/DevBanner";
import Homepage from "../NaviPages/homepage";

export default function App() {
  return (
    <div className="game-shell">
      <div className="game-canvas">
        <div className="ui-layer">
          <DevBanner />
          <Homepage />
        </div>

        <RouterProvider router={router} />
      </div>
    </div>
  );
}
