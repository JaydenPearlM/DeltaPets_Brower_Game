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
import "./wildwood.css";

export default function WildwoodPage() {
  const [session, setSession] = useState<WildwoodSession | null>(null);
  const [status, setStatus] = useState<WildwoodStatus | null>(null);
  const [formation, setFormation] = useState<Record<string, BattleRow>>({});
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [showBattle, setShowBattle] = useState(true);

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

    setFormation((current) =>
      Object.fromEntries(
        next.team.map((pet) => [pet.id, current[pet.id] ?? pet.row]),
      ),
    );
  }

  async function run(work: () => Promise<void>) {
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
      setShowBattle(true);
      setStatus(await fetchWildwoodStatus());
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
          <p className="ww-eyebrow">Explore Kithna</p>
          <h1>Wildwood</h1>
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
          busy={busy || Boolean(error)}
          onAction={action}
          onReturn={() =>
            void run(async () => {
              await reload();
              setShowBattle(false);
            })
          }
        />
      ) : (
        <>
          <section className="ww-explore">
            <h2>Follow the woodland path</h2>

            <p>
              Choose your formation, then explore. Each step may reveal a
              corrupted Kith. Battles use your current team.
            </p>

            {room && (
              <p className="ww-discovery" role="status">
                Step {room.sequence} · {room.message}
              </p>
            )}
          </section>

          <section className="ww-formation">
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
                    {pet.hpCur} / {pet.hpMax} HP · SPD {pet.spd}
                  </span>

                  <label>
                    Row
                    <select
                      disabled={busy}
                      value={formation[pet.id] ?? pet.row}
                      onChange={(event) =>
                        setFormation((current) => ({
                          ...current,
                          [pet.id]: event.target.value as BattleRow,
                        }))
                      }
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
              disabled={
                busy ||
                Boolean(error) ||
                !status?.wildwoodUnlocked ||
                !session?.team.length
              }
              onClick={explore}
            >
              {busy ? "Loading…" : "Explore Wildwood"}
            </button>
          </div>
        </>
      )}
    </main>
  );
}
