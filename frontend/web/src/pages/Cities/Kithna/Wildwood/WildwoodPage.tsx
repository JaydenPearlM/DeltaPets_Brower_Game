import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "@/lib/api/baseClient";
import type { RoamEncounterResult } from "@/lib/kithna/useRoamEncounter";
import { RoamEncounterToast } from "@/components/RoamEncounterToast/RoamEncounterToast";
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
import WildwoodExploreResult, {
  type WildwoodCollectedItem,
} from "./WildwoodExploreResult";
import { kennithCatalog } from "@/lib/kithna/kennithCatalog";
import WildwoodScene from "./WildwoodScene";
import WildwoodSkillsChamber from "./WildwoodSkillsChamber";
import "./wildwood.css";

export default function WildwoodPage() {
  const [session, setSession] = useState<WildwoodSession | null>(null);
  const [status, setStatus] = useState<WildwoodStatus | null>(null);
  const [formation, setFormation] = useState<Record<string, BattleRow>>({});
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [showBattle, setShowBattle] = useState(false);
  const [introBattleId, setIntroBattleId] = useState<string | null>(null);
  const introducedBattles = useRef(new Set<string>());
  const [prepared, setPrepared] = useState(false);
  const [visitSteps, setVisitSteps] = useState(0);
  const [visitRoomId, setVisitRoomId] = useState<string | null>(null);
  const [recentFinds, setRecentFinds] = useState<
    {
      id: string;
      name: string;
      category: "Eggs" | "Relics" | "Etchings" | "Clothes" | null;
      rarity?: number;
      description?: string | null;
    }[]
  >([]);
  const [collecting, setCollecting] = useState(false);

  const [eggEncounter, setEggEncounter] = useState<RoamEncounterResult | null>(
    null,
  );

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

    if (!mounted.current) return;

    setSession(next);

    setShowBattle(
      (current) =>
        next.room?.battle?.status === "active" ||
        (!session && Boolean(next.room?.xpReward)) ||
        (current && next.room?.id === session?.room?.id),
    );

    if (next.team.length) {
      setFormation((current) =>
        Object.fromEntries(
          next.team.map((pet) => [
            pet.id,
            current[pet.id] ??
              next.room?.battle?.participants.find(
                (unit) => unit.sourcePetId === pet.id,
              )?.row ??
              pet.row,
          ]),
        ),
      );
    }

    setStatus(null);
    const quest = await fetchWildwoodStatus();

    if (!mounted.current) return;

    setStatus(quest);

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
      if (
        document.visibilityState === "visible" &&
        session?.room?.battle?.status !== "active"
      ) {
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
      const battle = next.room?.battle;
      if (next.room?.corrupted && battle?.status === "active") {
        if (!introducedBattles.current.has(battle.id)) {
          introducedBattles.current.add(battle.id);
          setIntroBattleId(battle.id);
          setShowBattle(false);
        } else {
          setShowBattle(true);
        }
      } else {
        setShowBattle(false);
      }

      setEggEncounter(null);

      if (next.room && !next.room.battle) {
        try {
          const eggResult = await apiFetch<RoamEncounterResult>(
            "/api/kithna/roam",
            {
              method: "POST",
            },
          );

          if (!mounted.current) return;

          if (eggResult.found) {
            setEggEncounter(eggResult);
          }
        } catch (roamError) {
          if (import.meta.env.DEV) {
            console.warn(
              "[Wildwood] Optional roaming encounter failed:",
              roamError,
            );
          }
        }
      }

      const nextStatus = await fetchWildwoodStatus();

      if (mounted.current) {
        setStatus(nextStatus);
      }
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
  const chamberPet = session?.team.find((pet) => pet.hpCur > 0);
  const pathStep = Math.min(100, Math.max(0, room?.sequence ?? visitSteps));

  useEffect(() => {
    if (!introBattleId) return;
    const timer = window.setTimeout(
      () => {
        setIntroBattleId(null);
        if (
          room?.battle?.id === introBattleId &&
          room.battle.status === "active"
        ) {
          setShowBattle(true);
        }
      },
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 1500,
    );
    return () => window.clearTimeout(timer);
  }, [introBattleId, room?.battle?.id, room?.battle?.status]);

  const canExplore =
    !introBattleId &&
    !busy &&
    !collecting &&
    !error &&
    Boolean(status?.wildwoodUnlocked) &&
    Boolean(session?.team.some((pet) => pet.hpCur > 0)) &&
    room?.battle?.status !== "active";

  return (
    <>
      <header className="ww-page ww-title-panel dp-standard-panel">
        <h1>Wildwood</h1>
      </header>
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

        <nav className="ww-navigation" aria-label="Wildwood navigation">
          <Link to="/cities/kithna">Back to Kithna</Link>
        </nav>

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
            xpReward={room.xpReward}
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
                    </div>

                    <ul>
                      {Array.from({ length: 4 }, (_, index) => {
                        const pet = session?.team[index];
                        return pet ? (
                          <li key={pet.id}>
                            <KithPortrait
                              name={pet.name}
                              speciesId={pet.speciesId}
                              imageUrl={pet.imageUrl}
                            />

                            <strong>{pet.name}</strong>

                            <span>HP {pet.displayHp ?? "Unavailable"}</span>
                          </li>
                        ) : (
                          <li key={`empty-${index}`} className="ww-team-empty">
                            <span>Empty Slot</span>
                          </li>
                        );
                      })}
                    </ul>
                  </section>

                  <section
                    className="ww-recent-finds"
                    aria-label="Recent Finds"
                  >
                    <h2>Recent Finds</h2>
                    <div className="ww-find-columns">
                      {(["Eggs", "Relics", "Etchings", "Clothes"] as const).map(
                        (category) => {
                          const finds = recentFinds.filter(
                            (find) => find.category === category,
                          );
                          return (
                            <section key={category} aria-label={category}>
                              <h3>{category}</h3>
                              {finds.length ? (
                                <ul>
                                  {finds.map((find, index) => (
                                    <li key={`${index}-${find.name}`}>
                                      <strong>{find.name}</strong>
                                      {find.rarity != null && (
                                        <span>Rarity: {find.rarity}</span>
                                      )}
                                      {find.description && (
                                        <span>{find.description}</span>
                                      )}
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p>No discoveries this visit.</p>
                              )}
                            </section>
                          );
                        },
                      )}
                    </div>
                  </section>
                </div>

                <div className="ww-middle-column">
                  <WildwoodSkillsChamber
                    key={chamberPet?.id ?? "no-kith"}
                    petId={chamberPet?.id}
                    refreshSignal={room?.sequence ?? 0}
                  />
                  <section
                    className="ww-explore-viewport"
                    aria-label="Wildwood exploration"
                    aria-busy={busy}
                  >
                    {room &&
                    (room.id === visitRoomId || visitRoomId === null) ? (
                      <WildwoodExploreResult
                        key={room.id}
                        room={room}
                        busy={busy || Boolean(error)}
                        step={pathStep}
                        onBattle={() => setShowBattle(true)}
                        onCollected={(item: WildwoodCollectedItem) => {
                          const category = kennithCatalog.relics.some(
                            ({ slug }) => slug === item.slug,
                          )
                            ? "Relics"
                            : [
                                  ...kennithCatalog.clothing,
                                  ...kennithCatalog.accessories,
                                ].some(({ slug }) => slug === item.slug)
                              ? "Clothes"
                              : item.type === "etching"
                                ? "Etchings"
                                : null;
                          const id = `${room.id}:${item.slug}`;
                          setRecentFinds((finds) =>
                            finds.some((find) => find.id === id)
                              ? finds
                              : [
                                  ...finds,
                                  {
                                    id,
                                    name: item.name,
                                    category,
                                    rarity: item.rarity,
                                    description: item.description,
                                  },
                                ],
                          );
                        }}
                        onCollectingChange={setCollecting}
                      />
                    ) : (
                      <h2 className="ww-path-heading">Path {pathStep} / 100</h2>
                    )}

                    <div className="ww-explore-control">
                      <button
                        className="dp-btn dp-btn--yellow"
                        disabled={!canExplore}
                        onClick={explore}
                      >
                        {busy ? "Exploring...!" : "Explore Wildwood"}
                      </button>
                    </div>
                  </section>
                </div>

                <section className="ww-art-panel" aria-label="Wildwood scenery">
                  <WildwoodScene room={room} step={pathStep} />
                  {introBattleId && (
                    <div
                      key={introBattleId}
                      className="ww-battle-intro"
                      role="status"
                      aria-label="Battle starting"
                    >
                      <span
                        className="ww-battle-intro__streak ww-battle-intro__streak--cyan"
                        aria-hidden="true"
                      />
                      <span
                        className="ww-battle-intro__streak ww-battle-intro__streak--purple"
                        aria-hidden="true"
                      />
                      <span
                        className="ww-battle-intro__pulse"
                        aria-hidden="true"
                      />
                      <strong
                        className="ww-battle-intro__title"
                        aria-hidden="true"
                      >
                        BATTLE!
                      </strong>
                    </div>
                  )}
                </section>
              </div>
            ) : (
              <>
                <section className="ww-formation">
                  <p className="ww-eyebrow">Prepare</p>

                  <h2>Prepare for Wildwood</h2>

                  <p>
                    Your first living party member will battle one wild Kith at
                    a time.
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
                          HP {pet.displayHp ?? "Unavailable"} Â· SPD {pet.spd}
                        </span>
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
                    {busy ? "Loadingâ€¦" : "Enter Wildwood"}
                  </button>
                </div>
              </>
            )}
          </>
        )}

        <RoamEncounterToast
          result={eggEncounter}
          onTaken={(egg) =>
            setRecentFinds((finds) =>
              finds.some((find) => find.id === egg.egg_id)
                ? finds
                : [
                    ...finds,
                    { id: egg.egg_id, name: egg.egg_name, category: "Eggs" },
                  ],
            )
          }
          onDismiss={() => setEggEncounter(null)}
        />
      </main>
    </>
  );
}
