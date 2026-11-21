import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { apiFetch } from "@/lib/api/baseClient";
import { useKithProgression } from "./useKithProgression";

const stats = ["hp", "atk", "magi", "def", "spd", "mana"] as const;
const empty = () => ({ hp: 0, atk: 0, magi: 0, def: 0, spd: 0, mana: 0 });
export default function KithProgression({ petId, onSaved }: { petId: string; onSaved?: () => void }) {
  const [open, setOpen] = useState(false);
  const { state, error, loading, reload } = useKithProgression(petId, open);
  const [allocation, setAllocation] = useState(empty);
  const [selected, setSelected] = useState("");
  const [confirm, setConfirm] = useState<"stats" | "skill" | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState<{requestId:string;allocation:ReturnType<typeof empty>} | null>(null);
  const inFlight = useRef(false);
  const close = useRef<HTMLButtonElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (open) close.current?.focus(); }, [open]);
  const spent = stats.reduce((n, key) => n + allocation[key], 0);
  function dismiss() { if (!inFlight.current) { setOpen(false); setConfirm(null); opener.current?.focus(); } }
  async function save(kind: "stats" | "skill") {
    if (inFlight.current || !state) return;
    inFlight.current = true; setBusy(true); setMessage(null);
    try {
      if (kind === "stats") {
        const body = pending ?? { requestId: crypto.randomUUID(), allocation };
        setPending(body);
        await apiFetch(`/api/pets/progression/${petId}/stats`, { method: "POST", json: body });
        setPending(null); setAllocation(empty());
      } else {
        await apiFetch(`/api/pets/progression/${petId}/skill`, { method: "POST", json: { skillSlug: selected } });
        setSelected("");
      }
      setConfirm(null); setMessage("Saved. Reloading your Kith’s persisted state…"); reload(); onSaved?.();
    } catch (e) { setMessage(e instanceof Error ? e.message : "Save could not be confirmed. Retry the same choice."); }
    finally { inFlight.current = false; setBusy(false); }
  }
  async function decideEquipment(slot: number | null) {
    if (inFlight.current || !state?.pendingReplacement) return;
    inFlight.current = true; setBusy(true); setMessage(null);
    try {
      await apiFetch(`/api/pets/progression/${petId}/equipment-decision`, { method: "POST",
        json: { milestoneKey: state.pendingReplacement.milestone_key, slot } });
      setMessage(slot === null ? "Kept the learned skill without changing equipment." : "Replacement saved.");
      reload(); onSaved?.();
    } catch (e) { setMessage(e instanceof Error ? e.message : "Equipment decision could not be confirmed. Retry the same decision."); }
    finally { inFlight.current = false; setBusy(false); }
  }
  return <>
    <button ref={opener} type="button" className="dp-btn dp-btn--blue" onClick={() => setOpen(true)}>Level & skills</button>
    {open && createPortal(<div className="skillPopupBackdrop" onKeyDown={e => {
      if (e.key === "Escape") dismiss();
      if (e.key === "Tab") {
        const controls = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled)'))
          .filter(el => !el.closest('fieldset:disabled'));
        const first=controls[0], last=controls[controls.length-1];
        if (e.shiftKey && document.activeElement===first) { e.preventDefault();last?.focus(); }
        else if (!e.shiftKey && document.activeElement===last) { e.preventDefault();first?.focus(); }
      }
    }}>
      <section className="skillInventoryModal" role="dialog" aria-modal="true" aria-label="Kith progression">
        <button ref={close} type="button" className="skillPopupClose" disabled={busy} onClick={dismiss}>Close</button>
        <h3>Level & skills</h3>
        {loading && <p role="status">Loading saved progression…</p>}
        {error && <p role="alert">{error} <button onClick={reload}>Retry</button></p>}
        {message && <p role="status">{message}</p>}
        {state && <>
          <p>Level {state.pet.level} · XP {state.pet.xp} · Earned points {state.earnedPoints} · Unspent {state.pet.unspent_points}</p>
          {state.allocationStatus === "reconciliation_required" && <p role="alert">This Kith’s stat history needs review before points can be spent. Existing stats are preserved.</p>}
          <fieldset disabled={busy || loading || !!pending || state.allocationStatus !== "available"}>
            <legend>Assign stat points</legend>
            {stats.map(key => <label key={key}>{key === "mana" ? "Mana" : key.toUpperCase()} <input type="number" min={0} max={state.availablePoints} step={1} value={allocation[key]}
              onChange={e => { const value=Number(e.target.value); if(Number.isSafeInteger(value)&&value>=0) {setAllocation({...allocation,[key]:value});setConfirm(null);} }} /></label>)}
            <p>{spent} / {state.availablePoints} available points selected. HP adds maximum health without healing.</p>
          </fieldset>
          <button className="dp-btn dp-btn--blue" disabled={busy || loading || !pending && (spent<1 || spent>state.availablePoints || state.allocationStatus!=="available")}
            onClick={() => setConfirm("stats")}>{pending ? "Retry allocation" : "Review allocation"}</button>
          <fieldset disabled={busy || loading}>
            <legend>{state.nextMilestone ? `Choose one Level ${state.nextMilestone} skill` : "Skill choices"}</legend>
            {state.skillStatus === "definitions_unavailable" && <p role="status">This Kith’s skill choices are awaiting approved definitions.</p>}
            {state.skillStatus === "reconciliation_required" && <p role="alert">Saved skills or equipment need review. Existing learned skills are preserved.</p>}
            {state.choices.map(skill => <label key={skill.slug} className="skillInventoryCard">
              <input type="radio" name="level2-skill" checked={selected===skill.slug} onChange={()=>{setSelected(skill.slug);setConfirm(null);}} />
              <strong>{skill.name} · {skill.role === "sorcerer" ? "Caster" : skill.role}</strong><span>{skill.description}</span>
              <span>{skill.combatEnabled ? `${skill.manaCost} MP` : "Learnable; battle effects are not yet approved."}</span>
            </label>)}
            {state.choices.length===0 && <p>No unclaimed eligible choice is available.</p>}
            <button className="dp-btn dp-btn--blue" disabled={!state.choices.some(s=>s.slug===selected)} onClick={()=>setConfirm("skill")}>Review skill choice</button>
          </fieldset>
          {confirm && <div role="group" aria-label="Confirm progression decision">
            <p>{confirm==="skill" ? `Permanently learn ${state.choices.find(s=>s.slug===selected)?.name ?? selected}? This uses your single Level ${state.nextMilestone} choice.` : `Spend ${stats.reduce((n,k)=>n+(pending?.allocation??allocation)[k],0)} points on the selected stats?`}</p>
            <button className="dp-btn dp-btn--yellow" disabled={busy||loading} onClick={()=>void save(confirm)}>Confirm {confirm==="skill"?"skill":"allocation"}</button>
            <button disabled={busy} onClick={()=>setConfirm(null)}>Cancel</button>
          </div>}
          <h4>Learned skills</h4>
          <ul>{state.learned.map(skill=><li key={skill.skill_id}>{skill.definition?.name??"Saved skill (definition unavailable)"}</li>)}</ul>
          <h4>Four active skill slots</h4>
          <ol>{state.equippedSlots.map(({slot,skill}) => <li key={slot}>{skill ? skill.definition?.name ?? "Saved skill" : "Empty"}</li>)}</ol>
          {state.pendingReplacement && <fieldset disabled={busy || loading || state.skillStatus !== "available"}>
            <legend>Equip {state.learned.find(s => s.skill_id === state.pendingReplacement?.skill_id)?.definition?.name ?? "newly learned skill"}?</legend>
            <p>All slots are full. Replace one equipped skill or decline. Both skills remain learned.</p>
            {state.equippedSlots.map(({slot,skill}) => <button key={slot} type="button" disabled={!skill}
              onClick={() => void decideEquipment(slot)}>Replace slot {slot}: {skill?.definition?.name ?? "Saved skill"}</button>)}
            <button type="button" onClick={() => void decideEquipment(null)}>Decline replacement</button>
          </fieldset>}
        </>}
      </section>
    </div>,document.body)}
  </>;
}
