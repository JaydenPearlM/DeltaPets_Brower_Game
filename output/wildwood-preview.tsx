// Local visual harness only. Not imported by the production application.
import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import WildwoodBattle from "../frontend/web/src/pages/Cities/Kithna/Wildwood/WildwoodBattle";
import { createBattle, previewBattleOrder, resolveBattleAction } from "../backend/server/src/battle/battleEngine";
import type { BattleParticipantInput } from "../backend/server/src/battle/battleTypes";
import "../frontend/web/src/global.css";
import "../frontend/web/src/pages/Cities/Kithna/Wildwood/wildwood.css";
import "../frontend/web/src/mobile.css";

const team: BattleParticipantInput[] = [
  { id: "cribi", speciesId: "ice_starter", name: "Cribi", row: "front", side: "player", element: "ice", level: 1, hpMax: 40, hpCur: 30, atk: 8, def: 6, magi: 5, spd: 4 },
  { id: "kindlekin", speciesId: "fire_starter", name: "Kindlekin", row: "middle", side: "player", element: "fire", level: 1, hpMax: 36, hpCur: 36, atk: 9, def: 4, magi: 8, spd: 3 },
  { id: "espyr", speciesId: "shadow_night_bad", name: "Espyr", row: "middle", side: "player", element: "shadow", level: 1, hpMax: 30, hpCur: 22, atk: 7, def: 4, magi: 9, spd: 5 },
  { id: "solen", speciesId: "light_starter", name: "Solen", row: "back", side: "player", element: "light", level: 1, hpMax: 32, hpCur: 32, atk: 5, def: 5, magi: 10, spd: 3 },
  { id: "pebelin", speciesId: "kithna_pebelin", name: "Corrupted Pebelin", row: "front", side: "enemy", element: "earth", level: 1, hpMax: 38, hpCur: 38, atk: 6, def: 4, magi: 4, spd: 3 },
  { id: "shade", speciesId: "kithna_shade", name: "Corrupted Shade", row: "middle", side: "enemy", element: "shadow", level: 1, hpMax: 30, hpCur: 30, atk: 5, def: 3, magi: 7, spd: 4 },
];
function Preview() {
  const [battle, setBattle] = useState(() => createBattle("local-preview", team));
  const [error, setError] = useState("");
  return <main className="ww-page dp-standard-panel"><p>LOCAL VISUAL PREVIEW · Sample stats · No account data or rewards</p><button className="dp-btn dp-btn--blue" onClick={() => { setBattle(createBattle("local-preview", team)); setError(""); }}>Restart preview</button>{error && <p role="alert">{error}</p>}<WildwoodBattle key={`${battle.id}-${battle.turnNumber}`} battle={battle} images={{}} turnOrder={previewBattleOrder(battle)} busy={false} onReturn={() => setBattle(createBattle("local-preview", team))} onAction={action => { try { setBattle(resolveBattleAction(battle, action)); } catch (problem) { setError(String(problem)); } }} /></main>;
}
createRoot(document.getElementById("root")!).render(<Preview />);
