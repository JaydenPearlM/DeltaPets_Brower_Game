import { useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { BattleAction, BattleState } from "@shared/battle/wildwoodTypes";
import "./pveBattle.css";

import type { CombatCommands } from "../skillChamber/skillChamber";

type Unit = BattleState["participants"][number];
export default function PveBattle({ battle, turnOrder, busy, onAction, portrait, scenery, renderSkillsChamber, panels, selectedPetId, onSelectPet }: {
  selectedPetId?: string | null;
  onSelectPet?: (id: string) => void;
  panels?: { skills: HTMLElement | null; log: HTMLElement | null; actions: HTMLElement | null; priority: HTMLElement | null };
  battle: BattleState; turnOrder: string[]; busy: boolean;
  onAction: (action: BattleAction) => void;
  portrait: (unit: Unit) => ReactNode; scenery: ReactNode;
  renderSkillsChamber: (unit: Unit | undefined, combat: CombatCommands) => ReactNode;
}) {
  const [command, setCommand] = useState<CombatCommands["selected"]>("basic-strike");
  const [selected, setSelected] = useState("");
  const [viewedId, setViewedId] = useState<string | null>(null);
  const actor = battle.participants.find(p => p.id === battle.activeParticipantId);
  const targets = battle.participants.filter(p => !p.defeated && p.hpCur > 0 && p.side === (command === "mend" ? "player" : "enemy"));
  const target = targets.find(p => p.id === selected) ?? targets[0];
  const canAct = !busy && battle.status === "active" && actor?.side === "player";
  const enoughMp = command !== "mend" || (actor?.mpCur != null && actor.mpCur >= 1);
  function submit() {
    if (!canAct || !actor || viewed?.id !== actor.id || !enoughMp || (command !== "guard" && !target)) return;
    const base = { actorId: actor.id, turnNumber: battle.turnNumber };
    onAction(command === "guard" ? { ...base, action: "guard" } : { ...base, action: "skill", skillId: command, targetId: target!.id });
  }
  const players = battle.participants.filter(p => p.side === "player");
  const enemies = battle.participants.filter(p => p.side === "enemy");
  const viewed = players.find(p => p.id === (selectedPetId ?? viewedId) || p.sourcePetId === (selectedPetId ?? viewedId)) ?? players.find(p => p.id === actor?.id) ?? players[0];
  function slots(units: Unit[], selectable: boolean) {
    return Array.from({ length: Math.max(3, units.length) }, (_, index) => {
      const p = units[index];
      return <div className="pve-slot" key={p?.id ?? index} data-active={battle.status === "active" && p?.id === actor?.id} data-target={battle.status === "active" && command !== "guard" && p?.id === target?.id}>
        {p && (selectable ? <button type="button" className="pve-sprite" aria-label={"View " + p.name + " HP and MP"}
          aria-pressed={viewed?.id === p.id} onClick={() => { setViewedId(p.id); onSelectPet?.(p.sourcePetId ?? p.id); }}>{portrait(p)}</button>
          : <div className="pve-sprite" aria-label={p.name}>{portrait(p)}</div>)}
      </div>;
    });
  }
  function log() {
    const name = (id?: string) => battle.participants.find(p => p.id === id)?.name ?? "Kith";
    const describe = (event: BattleState["log"][number]) => {
      switch (event.type) {
        case "battle_started": return "The encounter began.";
        case "damage": return name(event.actorId) + " dealt " + event.amount + " damage to " + name(event.targetId) + ".";
        case "heal": return name(event.actorId) + " restored " + event.amount + " HP to " + name(event.targetId) + ".";
        case "guard": return name(event.actorId) + " is guarding.";
        case "skill": return name(event.actorId) + " used " + (event.skillId === "mend" ? "Mend" : "Elemental Strike") + ".";
        case "participant_defeated": return name(event.targetId ?? event.actorId) + " fainted.";
        case "victory": return "Victory!";
        case "defeat": return "Your party was defeated.";
        case "attack": return name(event.actorId) + " attacked " + name(event.targetId) + ".";
      }
    };
    return battle.log.length ? <ol className="pve-log" tabIndex={0} aria-label="Combat events">{battle.log.map((event, index) => <li key={index}><span>Turn {event.turnNumber}</span> {describe(event)}</li>)}</ol> : <p>No actions yet.</p>;
  }
  const place = (content: ReactNode, target?: HTMLElement | null) => target ? createPortal(content, target) : content;
  return <section className="pve-battle" aria-label="PvE battle" aria-busy={busy}>
    <div className="pve-arena">
      <div className="pve-stage">{scenery}<div className="pve-field">
        <div className="pve-enemies">{slots(enemies, false)}</div>
        <div className="pve-players">{slots(players, true)}</div>
        <section className="pve-enemy-hud" aria-label="Enemy health">{enemies.map(p => <div className="pve-enemy-status" key={p.id}
          data-target={battle.status === "active" && command !== "guard" && target?.id === p.id}>
          <strong>{p.name}</strong><span>HP {p.hpCur} / {p.hpMax}{p.defeated ? " · Fainted" : p.guarding ? " · Guarding" : ""}</span>
          <div className="pve-hp-track" role="progressbar" aria-label={p.name + " HP"} aria-valuenow={p.hpCur} aria-valuemin={0} aria-valuemax={p.hpMax}>
            <span style={{ width: `${p.hpMax > 0 ? Math.max(0, Math.min(100, p.hpCur / p.hpMax * 100)) : 0}%` }} />
          </div>
        </div>)}</section>
      </div></div>
      {place(<aside className="pve-priority" aria-label="Turn priority">
        <h3>Turn priority</h3>
        <p className="pve-turn-status" role="status">{battle.status === "active" ? "Turn " + battle.turnNumber + " — " + (actor?.name ?? "Resolving") : battle.status === "victory" ? "Victory!" : "Defeat"}</p>
        <ol>{turnOrder.map((id, i) => { const p = battle.participants.find(p => p.id === id); return p ? <li key={`${id}-${i}`} data-side={p.side} aria-current={battle.status === "active" && i === 0 && actor?.id === id ? "step" : undefined}>
          <span className="pve-order-number" aria-hidden="true">{i + 1}</span><div><strong>{p.name}</strong><small>{p.side === "player" ? "Ally" : "Enemy"} · SPD {p.spd}</small></div>
        </li> : null; })}</ol>
        <small>Server preview; knockouts can change the order.</small>
      </aside>, panels?.priority)}
    </div>
    <section className="pve-ally-hud" aria-label="Ally health and status">{(viewed ? [viewed] : []).map(p => <div className="pve-ally-status" key={p.id} data-active={battle.status === "active" && p.id === actor?.id}>
      <strong>{p.name}</strong><span>Lv. {p.level} · HP {p.hpCur} / {p.hpMax}{p.defeated ? " · Fainted" : p.guarding ? " · Guarding" : ""}</span>
      <div className="pve-hp-track" role="progressbar" aria-label={p.name + " HP"} aria-valuenow={p.hpCur} aria-valuemin={0} aria-valuemax={p.hpMax}><span style={{ width: Math.max(0, Math.min(100, p.hpCur / Math.max(1, p.hpMax) * 100)) + "%" }} /></div>
      <small>MP {p.mpCur ?? "—"} / {p.mpMax ?? "—"}</small>
    </div>)}</section>
    <div className="pve-bottom">
      {place(<section className="pve-info pve-controls" aria-label="Battle Skills Chamber">
        <div className="pve-chamber">{renderSkillsChamber(viewed, {
          selected: command,
          disabled: !canAct || viewed?.id !== actor?.id,
          mendDisabled: actor?.mpCur == null || actor.mpCur < 1,
          onSelect: id => { if (canAct && viewed?.id === actor?.id) { setCommand(id); setSelected(""); } },
          controls: battle.status === "active" ? <>
          {busy ? <p role="status">Confirming the last action…</p> : actor?.side !== "player" ? <p role="status">Waiting for the active combatant.</p> : viewed?.id !== actor?.id ? <p>Select the active Kith to act.</p> : null}
      <fieldset disabled={!canAct || viewed?.id !== actor?.id}><legend>Target and confirmation</legend>
        {command !== "guard" && <label>Target <select value={target?.id ?? ""} onChange={e => setSelected(e.target.value)}>{targets.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>}
        {!enoughMp && <p>Mend requires available MP.</p>}
        {place(<button type="button" className="dp-btn dp-btn--yellow" disabled={!canAct || viewed?.id !== actor?.id || !enoughMp || (command !== "guard" && !target)} onClick={submit}>Confirm Battle Action</button>, panels?.actions)}
      </fieldset>
        </> : <p>Battle complete.</p>
        })}</div>
      </section>, panels?.skills)}
      {place(<section className="pve-info pve-combat-log"><h3>Battle log</h3>{log()}</section>, panels?.log)}
    </div>
  </section>;
}
