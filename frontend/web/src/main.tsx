console.log("MAIN.TSX LOADED ✅", import.meta.url);

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./app/App";
import { AppProviders } from "./app/providers/AppProviders";
import "./styles/index.css";

console.log("MAIN IMPORTS APP =>", new URL("./app/App", import.meta.url).href);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </React.StrictMode>
);
