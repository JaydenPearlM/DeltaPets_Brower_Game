import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  acceptSomethingsAfoot, exploreWildwood, fetchWildwoodSession, fetchWildwoodStatus,
  submitWildwoodAction, turnInSomethingsAfoot,
  type BattleAction, type BattleRow, type WildwoodSession, type WildwoodStatus,
} from "@/lib/kithna/wildwoodApi";
import WildwoodBattle, { KithPortrait } from "./WildwoodBattle";
import "./wildwood.css";

export default function WildwoodPage() {
  const [session, setSession] = useState<WildwoodSession | null>(null);
  const [status, setStatus] = useState<WildwoodStatus | null>(null);
  const [formation, setFormation] = useState<Record<string, BattleRow>>({});
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [showBattle, setShowBattle] = useState(true);
  const inFlight = useRef(false);
  const mounted = useRef(true);

  async function reload() {
    const next = await fetchWildwoodSession();
    const quest = await fetchWildwoodStatus();
    if (!mounted.current) return;
    setSession(next);
    setStatus(quest);
    setFormation((current) => Object.fromEntries(next.team.map((pet) => [pet.id, current[pet.id] ?? pet.row])));
  }
  async function run(work: () => Promise<void>) {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError("");
    try { await work(); }
    catch (problem) { if (mounted.current) setError(problem instanceof Error ? problem.message : "Wildwood could not load. Please retry."); }
    finally { inFlight.current = false; if (mounted.current) setBusy(false); }
  }
  useEffect(() => {
    mounted.current = true;
    void run(reload);
    return () => { mounted.current = false; };
  }, []);

  function explore() {
    void run(async () => {
      if (!session) return;
      const next = await exploreWildwood({ requestId: crypto.randomUUID(), previousRoomId: session.room?.id ?? null, formation: session.team.map((pet) => ({ petId: pet.id, row: formation[pet.id] ?? pet.row })) });
      if (!mounted.current) return;
      setSession(next);
      setShowBattle(true);
      setStatus(await fetchWildwoodStatus());
    });
  }
  function action(decision: BattleAction) {
    void run(async () => {
      const battle = session?.room?.battle;
      if (!battle) return;
      const next = await submitWildwoodAction(battle.id, decision);
      if (!mounted.current) return;
      setSession(next);
      if (next.room?.battle?.status !== "active") setStatus(await fetchWildwoodStatus());
    });
  }
  const room = session?.room;
  return <main className="ww-page dp-standard-panel">
    <header className="ww-page-heading"><div><p className="ww-eyebrow">Explore Kithna</p><h1>Wildwood</h1></div><Link to="/cities/kithna">Back to Kithna</Link></header>
    {error && <div className="ww-error" role="alert"><p>{error}</p><button className="dp-btn dp-btn--blue" disabled={busy} onClick={() => void run(reload)}>Reload latest state</button></div>}
    {status && <div className="ww-quest"><strong>Somethings Afoot</strong><span>Corrupted Kith defeated: {status.quest.progress} / {status.quest.target}</span><span>{status.quest.status === "completed" ? "Completed · daily food unlocked" : status.quest.status === "ready_to_turn_in" ? "Ready to turn in" : status.quest.status === "available" ? "Available" : "In progress"}</span></div>}
    {room?.battle && showBattle ? <WildwoodBattle key={`${room.battle.id}-${room.battle.turnNumber}`} battle={room.battle} images={room.images} turnOrder={room.turnOrder} busy={busy || Boolean(error)} onAction={action} onReturn={() => void run(async () => { await reload(); setShowBattle(false); })} /> : <>
      <section className="ww-explore"><h2>Follow the woodland path</h2><p>Choose your formation, then explore. Each step may reveal a corrupted Kith. Battles use your current team.</p>{room && <p className="ww-discovery" role="status">Step {room.sequence} · {room.message}</p>}
        {status?.quest.status === "available" && <button className="dp-btn dp-btn--yellow" disabled={busy} onClick={() => void run(async () => { await acceptSomethingsAfoot(); await reload(); })}>Accept Somethings Afoot</button>}
        {status?.quest.status === "ready_to_turn_in" && <button className="dp-btn dp-btn--yellow" disabled={busy} onClick={() => void run(async () => { await turnInSomethingsAfoot(); await reload(); })}>Turn in Somethings Afoot</button>}
      </section>
      <section className="ww-formation"><h2>Your formation</h2><p>Rows set your position. They do not change stats in this version.</p><div className="ww-team">{session?.team.map((pet) => <article key={pet.id}><KithPortrait name={pet.name} speciesId={pet.speciesId} imageUrl={pet.imageUrl} /><strong>{pet.name}</strong><span>{pet.hpCur} / {pet.hpMax} HP · SPD {pet.spd}</span><label>Row<select disabled={busy} value={formation[pet.id] ?? pet.row} onChange={(event) => setFormation((current) => ({ ...current, [pet.id]: event.target.value as BattleRow }))}><option value="front">Front</option><option value="middle">Middle</option><option value="back">Back</option></select></label></article>)}</div>{session && !session.team.length && <p>Add hatched Kith to your team in the <Link to="/hatchery">Hatchery</Link> before exploring.</p>}</section>
      <div className="ww-explore-control"><button className="dp-btn dp-btn--yellow" disabled={busy || Boolean(error) || !status?.wildwoodUnlocked || !session?.team.length} onClick={explore}>{busy ? "Loading…" : "Explore Wildwood"}</button></div>
    </>}
  </main>;
}
