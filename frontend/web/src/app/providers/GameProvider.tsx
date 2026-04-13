import React, { createContext, useContext, useMemo, useState } from "react";

export type GameContextValue = {
  // Add/expand these as your app grows " " keep it simple for Alpha
  activePetId: string | null;
  setActivePetId: (id: string | null) => void;

  // Optional: a tiny “refresh token” pattern to force refetches
  refreshKey: number;
  bumpRefreshKey: () => void;
};

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [activePetId, setActivePetId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const value = useMemo<GameContextValue>(
    () => ({
      activePetId,
      setActivePetId,
      refreshKey,
      bumpRefreshKey: () => setRefreshKey((k) => k + 1),
    }),
    [activePetId, refreshKey],
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

/**
 * useGame
 * Named export hook that matches:
 *   import { useGame } from "@/app/providers/GameProvider";
 */
export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) {
    throw new Error("useGame must be used within <GameProvider>");
  }
  return ctx;
}
