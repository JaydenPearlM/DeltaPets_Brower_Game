import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  exploreWildwood,
  fetchWildwoodSession,
  fetchWildwoodStatus,
  submitWildwoodAction,
  type BattleAction,
  type BattleRow,
  type WildwoodSession,
  type WildwoodStatus,
} from "@/lib/kithna/wildwoodApi";
import WildwoodBattle, { KithPortrait } from "./WildwoodBattle";
import WildwoodExploreResult from "./WildwoodExploreResult";
import "./wildwood.css";

export default function WildwoodPage() {
  const [session, setSession] = useState<WildwoodSession | null>(null);
  const [status, setStatus] = useState<WildwoodStatus | null>(null);
  const [formation, setFormation] = useState<Record<string, BattleRow>>({});
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [showBattle, setShowBattle] = useState(false);
  const [prepared, setPrepared] = useState(false);
  const [visitSteps, setVisitSteps] = useState(0);
  const [visitRoomId, setVisitRoomId] = useState<string | null>(null);
  const [recentFinds, setRecentFinds] = useState<string[]>([]);
  const [collecting, setCollecting] = useState(false);

  const [questProgressFlash, setQuestProgressFlash] = useState<{
    progress: number;
    target: number;
    complete: boolean;
  } | null>(null);

  const inFlight = useRef(false);
  const mounted = useRef(true);
  const questFlashTimer = useRef<number | null>(null);

  async function reload() {
    const next = await fetchWildwoodSession();
    const quest = await fetchWildwoodStatus();

    if (!mounted.current) return;

    setSession(next);
    setStatus(quest);
    setShowBattle((current) =>
      next.room?.battle?.status === "active" ||
      (current && next.room?.id === session?.room?.id),
    );

    if (next.team.length) setFormation((current) =>
      Object.fromEntries(
        next.team.map((pet) => [
          pet.id,
          current[pet.id] ??
            next.room?.battle?.participants.find((unit) => unit.sourcePetId === pet.id)?.row ??
            pet.row,
        ]),
      ),
    );
    return next;
  }

  async function run(work: () => Promise<unknown>) {
    if (inFlight.current) return;

    inFlight.current = true;
    setBusy(true);
    setError("");

    try {
      await work();
    } catch (problem) {
      if (mounted.current) {
        setError(
          problem instanceof Error
            ? problem.message
            : "Wildwood could not load. Please retry.",
        );
      }
    } finally {
      inFlight.current = false;

      if (mounted.current) {
        setBusy(false);
      }
    }
  }

  useEffect(() => {
    mounted.current = true;

    void run(reload);

    return () => {
      mounted.current = false;

      if (questFlashTimer.current !== null) {
        window.clearTimeout(questFlashTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    function refreshTeam() {
      if (document.visibilityState === "visible" && session?.room?.battle?.status !== "active") {
        void run(reload);
      }
    }
    window.addEventListener("focus", refreshTeam);
    document.addEventListener("visibilitychange", refreshTeam);
    return () => {
      window.removeEventListener("focus", refreshTeam);
      document.removeEventListener("visibilitychange", refreshTeam);
    };
  }, [session?.room?.battle?.status]);

  function showQuestProgress(
    progress: number,
    target: number,
    complete: boolean,
  ) {
    if (questFlashTimer.current !== null) {
      window.clearTimeout(questFlashTimer.current);
    }

    setQuestProgressFlash({
      progress,
      target,
      complete,
    });

    questFlashTimer.current = window.setTimeout(
      () => {
        if (mounted.current) {
          setQuestProgressFlash(null);
        }

        questFlashTimer.current = null;
      },
      complete ? 2800 : 1800,
    );
  }

  function explore() {
    if (!canExplore) return;
    void run(async () => {
      if (!session) return;

      const next = await exploreWildwood({
        requestId: crypto.randomUUID(),
        previousRoomId: session.room?.id ?? null,
        formation: session.team.map((pet) => ({
          petId: pet.id,
          row: formation[pet.id] ?? pet.row,
        })),
      });

      if (!mounted.current) return;

      setSession(next);
      setVisitSteps((steps) => steps + 1);
      setVisitRoomId(next.room?.id ?? null);
      setShowBattle(false);
      const nextStatus = await fetchWildwoodStatus();
      if (mounted.current) setStatus(nextStatus);
    });
  }

  function action(decision: BattleAction) {
    void run(async () => {
      const battle = session?.room?.battle;

      if (!battle) return;

      const previousBattleStatus = battle.status;

      const next = await submitWildwoodAction(battle.id, decision);

      if (!mounted.current) return;

      setSession(next);

      const nextBattleStatus = next.room?.battle?.status;

      if (nextBattleStatus !== "active") {
        const nextStatus = await fetchWildwoodStatus();

        if (!mounted.current) return;

        setStatus(nextStatus);

        const becameVictory =
          previousBattleStatus === "active" && nextBattleStatus === "victory";

        if (
          becameVictory &&
          nextStatus.quest.status !== "available" &&
          nextStatus.quest.status !== "completed"
        ) {
          showQuestProgress(
            nextStatus.quest.progress,
            nextStatus.quest.target,
            nextStatus.quest.status === "ready_to_turn_in",
          );
        }
      }
    });
  }

  const room = session?.room;
  const canExplore = !busy && !collecting && !error && Boolean(status?.wildwoodUnlocked) &&
    Boolean(session?.team.some((pet) => pet.hpCur > 0)) && room?.battle?.status !== "active";

  return (
    <main className="ww-page dp-standard-panel">
      {questProgressFlash ? (
        <div
          className={[
            "ww-quest-progress-flash",
            questProgressFlash.complete
              ? "ww-quest-progress-flash--complete"
              : "",
          ]
            .filter(Boolean)
            .join(" ")}
          role="status"
          aria-live="polite"
        >
          <span className="ww-quest-progress-flash__label">
            Corrupted Kith defeated
          </span>

          <strong className="ww-quest-progress-flash__count">
            {questProgressFlash.progress} / {questProgressFlash.target}
          </strong>

          {questProgressFlash.complete ? (
            <span className="ww-quest-progress-flash__complete">
              Objective Complete
            </span>
          ) : null}
        </div>
      ) : null}
      <header className="ww-page-heading">
        <div>
          <h1>Wildwood</h1>
          <p className="ww-warning">Warning: corrupted Kith have been sighted nearby.</p>
        </div>

        <Link to="/cities/kithna">Back to Kithna</Link>
      </header>

      {error && (
        <div className="ww-error" role="alert">
          <p>{error}</p>

          <button
            className="dp-btn dp-btn--blue"
            disabled={busy}
            onClick={() => void run(reload)}
          >
            Reload latest state
          </button>
        </div>
      )}

      {room?.battle && showBattle ? (
        <WildwoodBattle
          key={`${room.battle.id}-${room.battle.turnNumber}`}
          battle={room.battle}
          images={room.images}
          turnOrder={room.turnOrder}
          corrupted={room.corrupted}
          busy={busy || Boolean(error)}
          onAction={action}
          onReturn={() =>
            void run(async () => {
              const next = await reload();
              if (!mounted.current || !next) return;
              setShowBattle(next.room?.battle?.status === "active");
              setPrepared(true);
            })
          }
        />
      ) : (
        <>
          {prepared ? (
            <div className="ww-exploration-layout">
              <div className="ww-exploration-info">
              <section className="ww-team-summary" aria-label="Your Team">
                <div className="ww-page-heading">
                  <h2>Your Team</h2>
                  <button className="dp-btn dp-btn--yellow" disabled={busy || collecting || room?.battle?.status === "active"} onClick={() => setPrepared(false)}>Edit formation</button>
                </div>
                <ul>
                  {session?.team.map((pet) => (
                    <li key={pet.id}>
                      <KithPortrait name={pet.name} speciesId={pet.speciesId} imageUrl={pet.imageUrl} />
                      <strong>{pet.name}</strong>
                      <span>{formation[pet.id] ?? pet.row} · HP {pet.displayHp ?? "Unavailable"}</span>
                    </li>
                  ))}
                </ul>
              </section>
              <section className="ww-recent-finds" aria-label="Recent Finds">
                <h2>Recent Finds</h2>
                {recentFinds.length ? (
                  <ul>{recentFinds.map((name, index) => <li key={`${index}-${name}`}>{name}</li>)}</ul>
                ) : <p>No items collected this visit.</p>}
              </section>
              <section className="ww-explore-viewport" aria-label="Wildwood exploration" aria-busy={busy}>
                {room && room.id === visitRoomId ? (
                  <WildwoodExploreResult key={room.id} room={room} busy={busy || Boolean(error)} step={visitSteps} onBattle={() => setShowBattle(true)} onCollected={(name) => setRecentFinds((finds) => [...finds, name])} onCollectingChange={setCollecting} />
                ) : (
                  <p className="ww-eyebrow">Steps this visit: {visitSteps}</p>
                )}
              </section>
              </div>
              <section className="ww-art-panel" aria-label="Wildwood art area" />
              <div className="ww-explore-control">
                <button className="dp-btn dp-btn--yellow" disabled={!canExplore} onClick={explore}>
                  {busy ? "Exploring…" : "Explore Wildwood"}
                </button>
              </div>
            </div>
          ) : (
          <>
          <section className="ww-formation">
            <p className="ww-eyebrow">Prepare</p>
            <h2>Your formation</h2>

            <p>
              Rows set your position. They do not change stats in this version.
            </p>

            <div className="ww-team">
              {session?.team.map((pet) => (
                <article key={pet.id}>
                  <KithPortrait
                    name={pet.name}
                    speciesId={pet.speciesId}
                    imageUrl={pet.imageUrl}
                  />

                  <strong>{pet.name}</strong>

                  <span>
                    HP {pet.displayHp ?? "Unavailable"} · SPD {pet.spd}
                  </span>

                  <label>
                    Row
                    <select
                      disabled={busy}
                      value={formation[pet.id] ?? pet.row}
                      onChange={(event) => {
                        const row = event.target.value;
                        if (row !== "front" && row !== "middle" && row !== "back") return;
                        setFormation((current) => ({
                          ...current,
                          [pet.id]: row,
                        }));
                      }}
                    >
                      <option value="front">Front</option>
                      <option value="middle">Middle</option>
                      <option value="back">Back</option>
                    </select>
                  </label>
                </article>
              ))}
            </div>

            {session && !session.team.length && (
              <p>
                Add hatched Kith to your team in the{" "}
                <Link to="/hatchery">Hatchery</Link> before exploring.
              </p>
            )}
          </section>

          <div className="ww-explore-control">
            <button
              className="dp-btn dp-btn--yellow"
              disabled={!canExplore}
              onClick={() => setPrepared(true)}
            >
              {busy ? "Loading…" : "Confirm formation"}
            </button>
          </div>
          </>
          )}
        </>
      )}
    </main>
  );
}
