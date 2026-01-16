import React from "react";
import { createBrowserRouter } from "react-router-dom";
import App from "../App";
import Homepage from "../../NaviPages/homepage";

function LoginPlaceholder() {
  return <div style={{ padding: 16 }}>Login page placeholder</div>;
}

function RegisterPlaceholder() {
  return <div style={{ padding: 16 }}>Register page placeholder</div>;
}

function CreatePlaceholder() {
  return <div style={{ padding: 16 }}>Character creation placeholder</div>;
}

function PetPlaceholder() {
  return <div style={{ padding: 16 }}>Pet page placeholder</div>;
}

function NotFound() {
  return <div style={{ padding: 16 }}>404 — Page not found</div>;
}

export const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <Homepage /> },

      // placeholders for now
      { path: "login", element: <LoginPlaceholder /> },
      { path: "register", element: <RegisterPlaceholder /> },
      { path: "create", element: <CreatePlaceholder /> },
      { path: "pet", element: <PetPlaceholder /> },
    ],
  },
  { path: "*", element: <NotFound /> },
]);
