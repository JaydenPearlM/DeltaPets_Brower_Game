import { Outlet } from "react-router-dom";
import { GameShell } from "../components/layout/GameShell";
import { GameBoot } from "../app/providers/GameBoot";

export default function App() {
  return (
    <GameShell>
      <GameBoot />
      <Outlet />
    </GameShell>
  );
}
