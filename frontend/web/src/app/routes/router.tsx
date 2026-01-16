//This is just a placeholder
//Dont use this for prod

import React from "react";
import { createBrowserRouter } from "react-router-dom";
import RequireAuth from "./RequireAuth";

function LoginPlaceholder() {
  return <div style={{ padding: 10 }}>Login page placeholder (skeleton)</div>;
}

function AuthedHomePlaceholder() {
  return <div style={{ padding: 16 }}>Authed page placeholder (skeleton)</div>;
}

function NotFound() {
  return <div style={{ padding: 16 }}>404 — Page not found</div>;
}

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPlaceholder /> },
  {
    path: "/",
    element: (
      <RequireAuth>
        <AuthedHomePlaceholder />
      </RequireAuth>
    ),
  },
  { path: "*", element: <NotFound /> },
]);

//The above code is just a placeholder.

// import { createBrowserRouter } from "react-router-dom";
// import RequireAuth from "./RequireAuth";
// // Optional: a simple not-found page
// function NotFound() {
//   return <div style={{ padding: 16 }}>404 — Page not found</div>;
// }

// export const router = createBrowserRouter([
//   {
//     path: "/login",
//     element: <LoginPage />,
//   },
//   {
//     path: "/",
//     element: (
//       <RequireAuth>
//         <PetPage />
//       </RequireAuth>
//     ),
//   },
//   {
//     path: "*",
//     element: <NotFound />,
//   },
// ]);
