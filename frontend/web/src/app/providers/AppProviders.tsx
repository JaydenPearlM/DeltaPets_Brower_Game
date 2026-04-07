import React from "react";
import { AuthProvider } from "./AuthProvider";
import { GameProvider } from "./GameProvider";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <GameProvider>{children}</GameProvider>
    </AuthProvider>
  );
}
