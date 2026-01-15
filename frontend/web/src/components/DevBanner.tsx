import React from "react";

export function DevBanner() {
  // Only show in dev (Vite sets this)
  if (!import.meta.env.DEV) return null;

  return (
    <div style={{ padding: "2rem", fontFamily: "system-ui, sans-serif" }}>
      <div
        style={{
          padding: "12px 16px",
          border: "2px solid red",
          marginBottom: "16px",
        }}
      >
        <h1 style={{ color: "red", margin: 0 }}>EDITED APP IS LOADING</h1>
        <div style={{ fontSize: 12, opacity: 0.8 }}>{import.meta.url}</div>
      </div>

      <h2 style={{ marginTop: 0 }}>Deltapets</h2>
      <p>Pre-Alpha environment is running.</p>
      <p>
        Coming Soon — visit my website at{" "}
        <a
          href="https://jayden-devfolio.com"
          target="_blank"
          rel="noopener noreferrer"
          style={{ textDecoration: "underline" }}
        >
          jayden-devfolio.com
        </a>
      </p>
    </div>
  );
}
