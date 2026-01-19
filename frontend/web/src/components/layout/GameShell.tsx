import type { ReactNode } from "react";

export function GameShell({ children }: { children: ReactNode }) {
  return (
    <div className="game-shell">
      <div className="game-canvas">
        {children}
        <div className="ui-layer" />
      </div>
    </div>
  );
}
