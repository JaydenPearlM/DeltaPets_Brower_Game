import { useState } from "react";
import type { BattleAction, BattleState } from "@shared/battle/wildwoodTypes";
import { getStarterPortrait } from "@/kith/registry/starterPortraits";

type Props = {
  battle: BattleState;
  images: Record<string, string | null>;
  turnOrder: string[];
  busy: boolean;
  onAction: (action: BattleAction) => void;
  onReturn: () => void;
};

export function KithPortrait({ speciesId, imageUrl, name }: { speciesId: string; imageUrl?: string | null; name: string }) {
  const [failed, setFailed] = useState(false);
  const source = imageUrl || getStarterPortrait(speciesId);
  return source && !failed
    ? <img className="ww-portrait" src={source} alt={name} onError={() => setFailed(true)} />
    : <span className="ww-art-pending">Portrait pending</span>;
}

export default function WildwoodBattle({ battle, images, turnOrder, busy, onAction, onReturn }: Props) {
  const [command, setCommand] = useState<"basic_attack" | "basic-strike" | "mend">("basic_attack");
  const actor = battle.participants.find((pet) => pet.id === battle.activeParticipantId);
  const active = battle.status === "active";
  const canAct = active && actor?.side === "player" && !actor.defeated && !busy;
  const label = (id?: string) => battle.participants.find((pet) => pet.id === id)?.name ?? "Kith";
  const legal = (pet: BattleState["participants"][number]) => Boolean(canAct && !pet.defeated && (command === "mend" ? pet.side === "player" : pet.side === "enemy"));
  function target(id: string) {
    if (!canAct || !actor) return;
    const base = { actorId: actor.id, turnNumber: battle.turnNumber, targetId: id };
    onAction(command === "basic_attack" ? { ...base, action: "basic_attack" } : { ...base, action: "skill", skillId: command });
  }
  function eventText(event: BattleState["log"][number]) {
    switch (event.type) {
      case "battle_started": return "A corrupted encounter begins.";
      case "attack": return `${label(event.actorId)} attacked ${label(event.targetId)}.`;
      case "skill": return `${label(event.actorId)} used Element Strike on ${label(event.targetId)}.`;
      case "damage": return `${label(event.targetId)} took ${event.amount} damage.`;
      case "heal": return `${label(event.actorId)} used Mend. ${label(event.targetId)} recovered ${event.amount} HP.`;
      case "guard": return `${label(event.actorId)} is guarding.`;
      case "participant_defeated": return `${label(event.targetId)} was defeated.`;
      case "victory": return "Victory — all corrupted Kith defeated.";
      case "defeat": return "Defeat — your Kith collection is safe.";
    }
  }
  return <section className="ww-battle" aria-label="Wildwood battle" aria-busy={busy}>
    <header className="ww-battle-heading">
      <div><p className="ww-eyebrow">Kithna Wildwood</p><h2>{active ? "Corrupted encounter" : battle.status === "victory" ? "Victory" : "Defeat"}</h2></div>
      <span className="ww-affinity">Earth affinity · no bonus</span>
    </header>
    <p className="ww-turn" role="status">{busy ? "Resolving your action…" : active ? `${actor?.name ?? "Enemy"}'s turn` : battle.status === "victory" ? "The woodland path is clear." : "Your encounter has ended. No permanent damage was applied."}</p>
    {active && <div className="ww-turn-order" aria-label="Upcoming initiative order"><span>Upcoming</span>{turnOrder.map((id, index) => <span key={`${index}-${id}`} className={index === 0 ? "ww-next-now" : ""}>{index + 1}. {label(id)}</span>)}</div>}
    <div className="ww-field">
      {(["enemy", "player"] as const).map((side) => <section className={`ww-side ww-side-${side}`} key={side} aria-label={side === "enemy" ? "Corrupted Kith" : "Your team"}>
        <h3>{side === "enemy" ? "Corrupted Kith" : "Your team"}</h3>
        <div className="ww-lanes">{(side === "enemy" ? ["back", "middle", "front"] : ["front", "middle", "back"]).map((row) => {
          const units = battle.participants.filter((pet) => pet.side === side && pet.row === row);
          return <div className="ww-lane" key={row}><h4>{row}</h4>{units.length ? units.map((pet) => <button
            type="button" key={pet.id} className={`ww-unit ${pet.id === actor?.id ? "ww-unit-active" : ""} ${pet.defeated ? "ww-unit-defeated" : ""}`}
            disabled={!legal(pet)} onClick={() => target(pet.id)} aria-label={`${pet.name}, ${pet.hpCur} of ${pet.hpMax} HP${legal(pet) ? ", select target" : ""}`}>
            <span className="ww-unit-name">{pet.name}</span>
            <KithPortrait speciesId={pet.speciesId} name={pet.name} imageUrl={images[pet.id]} />
            <span className="ww-hp"><span style={{ width: `${pet.hpCur / pet.hpMax * 100}%` }} /></span>
            <span>{pet.hpCur} / {pet.hpMax} HP</span>
            <span className="ww-unit-meta">{pet.element === "null_element" ? "Voidborne" : pet.element} · SPD {pet.spd}</span>
            {pet.guarding && <strong>Guarding</strong>}{pet.defeated && <strong>Defeated</strong>}
          </button>) : <span className="ww-empty-row">Empty row</span>}</div>;
        })}</div>
      </section>)}
    </div>
    {active ? <div className="ww-actions">
      <div className="ww-command-buttons" role="group" aria-label="Battle commands">
        <button className="dp-btn dp-btn--yellow" disabled={!canAct} aria-pressed={command === "basic_attack"} onClick={() => setCommand("basic_attack")}>Attack</button>
        <button className="dp-btn dp-btn--purple" disabled={!canAct} aria-pressed={command !== "basic_attack"} onClick={() => setCommand("basic-strike")}>Skill</button>
        <button className="dp-btn dp-btn--blue" disabled={!canAct} onClick={() => actor && onAction({ actorId: actor.id, turnNumber: battle.turnNumber, action: "guard" })}>Guard</button>
      </div>
      {command !== "basic_attack" && <label className="ww-skill-select">Skill<select value={command} disabled={!canAct} onChange={(event) => setCommand(event.target.value as "basic-strike" | "mend")}><option value="basic-strike">Element Strike</option><option value="mend">Mend</option></select></label>}
      <p>{command === "mend" ? "Select a living ally to heal." : "Select a living enemy to attack."} Guard takes effect immediately.</p>
    </div> : <div className="ww-result"><p>XP and corrupted-egg rewards are not enabled in this version.</p><button className="dp-btn dp-btn--yellow" disabled={busy} onClick={onReturn}>Return to Wildwood</button></div>}
    <details className="ww-log" open><summary>Battle log</summary><ol>{battle.log.map((event, index) => <li key={`${index}-${event.turnNumber}`}>{eventText(event)}</li>)}</ol></details>
  </section>;
}
