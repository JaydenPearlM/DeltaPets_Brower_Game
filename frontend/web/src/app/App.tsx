import React from "react";
import { RouterProvider } from "react-router-dom";
import { router } from "./routes/router";
import { DevBanner } from "../components/DevBanner";

export default function App() {
  return (
    <>
      <DevBanner />
      <RouterProvider router={router} />
    </>
  );
}
