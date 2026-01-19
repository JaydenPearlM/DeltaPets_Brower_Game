import { Outlet } from "react-router-dom";
import { GameShell } from "../components/layout/GameShell";

export default function App() {
  return (
    <GameShell>
      <Outlet />
    </GameShell>
  );
}
