import "./GameShell.css";
import type { ReactNode } from "react";
import LogoDeltapets from "../Logo/Logo_Deltapets";

type GameShellProps = {
  children: ReactNode;
};

export function GameShell({ children }: GameShellProps) {
  return (
    <div className="dp-app">
      <header className="dp-header">
        {/* Full-width banner background plate */}
        <div className="dp-bannerPlate" aria-hidden="true" />

        <div className="dp-headerInner">
          <div className="dp-headerContent">
            <div className="dp-headerLeft">
              <LogoDeltapets variant="header" className="header-logo" />
            </div>

            <div className="dp-headerRight">{/* nav later */}</div>
          </div>
        </div>
      </header>

      <main className="dp-scrollArea">
        <div className="dp-canvas">
          <div className="dp-content">{children}</div>
        </div>
      </main>
    </div>
  );
}
