import { useEffect } from "react";
import { useGameStore } from "../state/gameStore";

export function GameBoot() {
  const boot = useGameStore((s) => s.boot);

  useEffect(() => {
    boot();
  }, [boot]);

  return null;
}
