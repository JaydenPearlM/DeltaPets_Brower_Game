import { getBattleBackSprite } from "@/kith/registry/battleBackSprites";
import PveBattle from "@/components/battle/PveBattle";
import clodionCorrupt from "@/kith/assets/Kithna_pets/corrupt/hatchling_clodion_corrupt.png";
import glimmerCorrupt from "@/kith/assets/Kithna_pets/corrupt/hathcling_glimmer_corrupt.png";
import magmadoCorrupt from "@/kith/assets/Kithna_pets/corrupt/hatchling_magmoda_corrupt.png";
import pebelinCorrupt from "@/kith/assets/Kithna_pets/corrupt/hatchling_pebelin_corrupt.png";
import shadeCorrupt from "@/kith/assets/Kithna_pets/corrupt/hatchling_shade_corrupt.png";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/app/providers/useAuth";
import { usePetStorage } from "@/components/Hatchery/pages/storage/usePetStorage";
import { Link, useBlocker } from "react-router-dom";
import { apiFetch } from "@/lib/api/baseClient";
import type { RoamEncounterResult } from "@/lib/kithna/useRoamEncounter";
import { RoamEncounterToast } from "@/components/RoamEncounterToast/RoamEncounterToast";
import {
  actInWildwood,
  exploreWildwood,
  fetchWildwoodSession,
  fetchWildwoodStatus,
  type BattleRow,
  type WildwoodSession,
  type WildwoodStatus,
} from "@/lib/kithna/wildwoodApi";
import { findPetSpeciesById } from "@shared/pets/species";
import { KithPortrait } from "./KithPortrait";
import WildwoodExploreResult from "./WildwoodExploreResult";
import { useUI } from "@/app/providers/UIProvider";
import WildwoodInventory from "./WildwoodInventory";
import { moveTeamMember, useWildwoodVisit } from "./useWildwoodVisit";
import WildwoodScene from "./WildwoodScene";
import WildwoodStats from "./WildwoodStats";
import WildwoodSkillsChamber from "./WildwoodSkillsChamber";
import "./wildwood.css";
import "./wildwoodLayout.css";

export default function WildwoodPage() {
  const [session, setSession] = useState<WildwoodSession | null>(null);
  const { user } = useAuth();
  const { openInventory, inventoryLocked } = useUI();
  const [inventoryRevision, setInventoryRevision] = useState(0);
  const [selectedPetId, setSelectedPetId] = useState<string | null>(null);
  const [teamOrder, setTeamOrder] = useState<string[]>([]);
  const [orderNotice, setOrderNotice] = useState("");
  const { visit, setPrepared, recordRoom } = useWildwoodVisit(user?.id);
  const prepared = visit.prepared;
  const needsPartyDisplay = Boolean(
    session?.room?.battle && !session.team.length,
  );
  const partyDisplay = usePetStorage({
    userId: user?.id,
    refreshSignal: inventoryRevision,
  });
  const [status, setStatus] = useState<WildwoodStatus | null>(null);
  const [formation, setFormation] = useState<Record<string, BattleRow>>({});
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [collecting, setCollecting] = useState(false);
  const [treasurePending, setTreasurePending] = useState(false);
  const [shinyTarget, setShinyTarget] = useState<HTMLElement | null>(null);
  const [skillsTarget, setSkillsTarget] = useState<HTMLDivElement | null>(null);
  const [logTarget, setLogTarget] = useState<HTMLDivElement | null>(null);
  const [actionTarget, setActionTarget] = useState<HTMLDivElement | null>(null);
  const [priorityTarget, setPriorityTarget] = useState<HTMLDivElement | null>(
    null,
  );

  const [eggEncounter, setEggEncounter] = useState<RoamEncounterResult | null>(
    null,
  );

  const inFlight = useRef(false);
  const mounted = useRef(true);
  const departure = useRef(false);
  const [departureError, setDepartureError] = useState("");
  const blocker = useBlocker(({ currentLocation, nextLocation }) =>
    Boolean(user) && (treasurePending || collecting || Boolean(eggEncounter?.found)) && currentLocation.pathname !== nextLocation.pathname,
  );

  useEffect(() => {
    if (blocker.state !== "blocked" || busy || collecting || departure.current) return;
    departure.current = true;
    setDepartureError("");
    void apiFetch<{ success: boolean }>("/api/kithna/wildwood/treasure/discard", {
      method: "POST",
    }).then(result => {
      if (result.success !== true) throw new Error("Treasure departure was not confirmed.");
      blocker.proceed();
    }).catch(() => {
      setDepartureError("Could not discard unclaimed Treasure. Please try leaving again.");
      blocker.reset();
    }).finally(() => { departure.current = false; });
  }, [blocker, busy, collecting]);

  async function reload() {
    const next = await fetchWildwoodSession();

    if (!mounted.current) return;

    setSession(next);
    if (next.room?.pveEnabled && next.room.battle) setPrepared(true);

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
      recordRoom(next.room?.id ?? null);
      setEggEncounter(null);

      if (next.room && !next.room.battle) {
        try {
          const eggResult = await apiFetch<RoamEncounterResult>(
            "/api/kithna/roam",
            {
              method: "POST",
              json: { wildwoodRoomId: next.room.id },
            },
          );

          if (!mounted.current) return;

          if (eggResult.found) {
            setEggEncounter(eggResult);
          }
        } catch (roamError) {
          setError(roamError instanceof Error ? roamError.message : "Could not check the egg encounter.");
        }
      }

      const nextStatus = await fetchWildwoodStatus();

      if (mounted.current) {
        setStatus(nextStatus);
      }
    });
  }

  const room = session?.room;
  const battle = room?.battle;
  const activeId = battle?.activeParticipantId;
  const chamberPet =
    session?.team.find((pet) => pet.id === selectedPetId) ??
    session?.team.find((pet) => pet.hpCur > 0);
  const pathStep = visit.steps;
  const canExplore =
    blocker.state === "unblocked" &&
    !busy &&
    !collecting &&
    !error &&
    Boolean(status?.wildwoodUnlocked) &&
    Boolean(session?.team.some((pet) => pet.hpCur > 0)) &&
    battle?.status !== "active";
  const team = needsPartyDisplay
    ? partyDisplay.partySlots.flatMap((slot) =>
        slot.pet
          ? [
              {
                id: slot.pet.id,
                name: slot.pet.nickname || slot.pet.name || "Unnamed Kith",
                speciesId: slot.pet.species ?? "",
                imageUrl: slot.pet.portrait_url,
                level: slot.pet.level,
                spd: slot.pet.spd,
              },
            ]
          : [],
      )
    : (session?.team ?? []);
  const orderedIds = [
    ...teamOrder.filter((id) => team.some((pet) => pet.id === id)),
    ...team.map((pet) => pet.id).filter((id) => !teamOrder.includes(id)),
  ];
  const orderedTeam = orderedIds.flatMap(
    (id) => team.find((pet) => pet.id === id) ?? [],
  );
  function reorder(id: string, destination: number) {
    if (busy || collecting) return;
    setTeamOrder(moveTeamMember(orderedIds, id, destination));
    setOrderNotice("Team display order updated. Combat priority is unchanged.");
  }
  const exploreReason = busy
    ? "Loading the latest state…"
    : collecting
      ? "Finish collecting your discovery first."
      : error
        ? "Reload the latest state to continue."
        : !status?.wildwoodUnlocked
          ? "Accept Something’s Afoot to enter Wildwood."
          : !session?.team.some((pet) => pet.hpCur > 0)
            ? "A living party Kith is required to explore."
            : battle?.status === "active"
              ? "Finish or recover the current battle before exploring."
              : "";

  return (
    <>
      <header className="ww-page ww-title-panel dp-standard-panel">
        <h1>Wildwood</h1>
      </header>

      <main className="ww-page ww-workspace dp-standard-panel">
        <nav className="ww-navigation" aria-label="Wildwood navigation">
          <Link to="/cities/kithna">← Back to Kithna</Link>
        </nav>

        {departureError && <p className="ww-error" role="alert">{departureError}</p>}
        {blocker.state === "blocked" && <p role="status">Discarding unclaimed Treasure…</p>}

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

        {battle?.status === "active" && !room?.pveEnabled && (
          <p className="ww-error" role="status">
            An unfinished legacy battle is saved. Exploration is blocked until
            encounter recovery is supported. No victory or rewards have been
            granted.
          </p>
        )}

        <div className="ww-dashboard">
          <aside className="ww-team-panel ww-card" aria-label="Kith Companions">
            <div className="ww-card-heading">
              <h2>Kith Companions</h2>
            </div>

            {needsPartyDisplay && partyDisplay.error ? (
              <div role="alert">
                Team unavailable.{" "}
                <button
                  type="button"
                  onClick={() => void partyDisplay.reload()}
                >
                  Retry team
                </button>
              </div>
            ) : (
              <ol className="ww-team-cards">
                {orderedTeam.map((pet, index) => {
                  const unit = battle?.participants.find(
                    (participant) =>
                      participant.sourcePetId === pet.id ||
                      participant.id === pet.id,
                  );
                  const stats = session?.team.find(
                    (member) => member.id === pet.id,
                  );
                  const species = findPetSpeciesById(pet.speciesId);
                  const element = species
                    ? "line" in species
                      ? species.line
                      : species.primaryElement
                    : "unknown";

                  return (
                    <li
                      key={pet.id}
                      className="ww-team-card"
                      data-element={element}
                      aria-current={
                        battle?.status === "active" && unit?.id === activeId
                          ? "true"
                          : undefined
                      }
                      draggable={!busy && !collecting}
                      onDragStart={(event) =>
                        event.dataTransfer.setData("text/plain", pet.id)
                      }
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event) => {
                        event.preventDefault();
                        reorder(
                          event.dataTransfer.getData("text/plain"),
                          index,
                        );
                      }}
                    >
                      <span className="ww-team-number">{index + 1}</span>

                      <div className="ww-team-portrait">
                        {stats ? (
                          <WildwoodStats pet={stats}>
                            <KithPortrait
                              name={pet.name}
                              speciesId={pet.speciesId}
                              imageUrl={pet.imageUrl}
                            />
                          </WildwoodStats>
                        ) : (
                          <KithPortrait
                            name={pet.name}
                            speciesId={pet.speciesId}
                            imageUrl={pet.imageUrl}
                          />
                        )}
                      </div>

                      <div className="ww-team-copy">
                        <button
                          type="button"
                          className="ww-team-select"
                          disabled={Boolean(battle && !unit)}
                          title={
                            battle && !unit
                              ? "This Kith is not participating in the saved battle."
                              : "View this Kith"
                          }
                          aria-pressed={
                            selectedPetId
                              ? selectedPetId === pet.id
                              : unit?.id === activeId
                          }
                          onClick={() => setSelectedPetId(pet.id)}
                        >
                          {pet.name}
                        </button>
                        <span>
                          Lv. {pet.level ?? "—"} · SPD {pet.spd ?? "—"}
                        </span>
                        {unit && (
                          <small>
                            {unit.defeated
                              ? "Fainted"
                              : unit.guarding
                                ? "Guarding"
                                : unit.id === activeId &&
                                    battle?.status === "active"
                                  ? "Active turn"
                                  : ""}
                          </small>
                        )}
                      </div>

                      <div className="ww-team-moves">
                        <button
                          type="button"
                          aria-label={"Move " + pet.name + " up"}
                          disabled={index === 0 || busy || collecting}
                          onClick={() => reorder(pet.id, index - 1)}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          aria-label={"Move " + pet.name + " down"}
                          disabled={
                            index === orderedTeam.length - 1 ||
                            busy ||
                            collecting
                          }
                          onClick={() => reorder(pet.id, index + 1)}
                        >
                          ↓
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}

            {!orderedTeam.length && (
              <p>
                {busy || partyDisplay.loading
                  ? "Loading your team…"
                  : "Add hatched Kith to your party in the Hatchery."}
              </p>
            )}
            <p className="ww-sr-only" role="status">
              {orderNotice}
            </p>
            <Link to="/hatchery">Manage party →</Link>
          </aside>

          <div className="ww-battle-column">
            <div className="ww-card-heading ww-field-heading">
              <h2>{battle ? "Battlefield" : "Wildwood Entrance"}</h2>
            </div>

            <section
              ref={setShinyTarget}
              className="ww-art-panel"
              aria-label="Wildwood scenery"
            >
              {room?.pveEnabled && battle ? (
                <PveBattle
                  key={battle.id}
                  battle={battle}
                  turnOrder={room.turnOrder}
                  busy={busy || Boolean(error)}
                  selectedPetId={selectedPetId}
                  onSelectPet={setSelectedPetId}
                  panels={{
                    skills: skillsTarget,
                    log: logTarget,
                    actions: actionTarget,
                    priority: priorityTarget,
                  }}
                  scenery={
                    <WildwoodScene
                      panoramic
                      room={room}
                      step={Math.max(1, pathStep)}
                    />
                  }
                  renderSkillsChamber={(pet, combat) => (
                    <WildwoodSkillsChamber
                      combat={combat}
                      key={pet?.id ?? "no-kith"}
                      petId={pet?.sourcePetId ?? pet?.id}
                      battleMp={pet}
                      battleHp={pet}
                      refreshSignal={room.sequence}
                    />
                  )}
                  portrait={(pet) => (
                    <KithPortrait
                      name={pet.name}
                      speciesId={pet.speciesId}
                      imageUrl={
                        pet.side === "enemy"
                          ? (
                              {
                                kithna_clodian: clodionCorrupt,
                                kithna_glimmer: glimmerCorrupt,
                                kithna_magmado: magmadoCorrupt,
                                kithna_pebelin: pebelinCorrupt,
                                kithna_shade: shadeCorrupt,
                              } as Record<string, string>
                            )[pet.speciesId]
                          : (getBattleBackSprite(pet.speciesId) ??
                            room.images[pet.id])
                      }
                    />
                  )}
                  onAction={(action) => {
                    void run(async () => {
                      const next = await actInWildwood(battle.id, action);
                      if (!mounted.current) return;
                      setSession((current) => ({
                        ...next,
                        team: next.team.length
                          ? next.team
                          : (current?.team ?? []),
                      }));
                      if (next.room?.battle?.status !== "active")
                        await reload();
                    });
                  }}
                />
              ) : (
                <WildwoodScene
                  panoramic
                  room={prepared ? room : null}
                  step={pathStep}
                />
              )}
            </section>

            {room?.xpReward && (
              <p className="ww-confirmed-reward" role="status">
                Confirmed reward · XP +{room.xpReward.amount} · Level{" "}
                {room.xpReward.level}
              </p>
            )}
          </div>

          <div className="ww-trail-column">
            <aside
              className="ww-path-panel ww-card"
              aria-label="Wildwood Trail"
            >
              <div className="ww-card-heading">
                <h2>Wildwood Trail</h2>
                <strong>
                  {pathStep}
                  <small> / 100</small>
                </strong>
              </div>
              <div
                className="ww-path-track"
                role="progressbar"
                aria-label="Wildwood trail progress"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={pathStep}
              >
                <span style={{ width: pathStep + "%" }} />
              </div>
              <div className="ww-path-markers">
                {[0, 25, 50, 75, 100].map((marker) => (
                  <span key={marker} data-reached={pathStep >= marker}>
                    {marker}
                  </span>
                ))}
              </div>
              <div
                ref={setPriorityTarget}
                className="pve-battle ww-priority-panel"
              />
              {prepared &&
              room &&
              (room.id === visit.roomId || visit.roomId === null) ? (
                <WildwoodExploreResult
                  key={room.id}
                  shinyTarget={shinyTarget}
                  room={room}
                  busy={busy || Boolean(error)}
                  step={pathStep}
                  onCollected={() => setInventoryRevision((value) => value + 1)}
                  onCollectingChange={setCollecting}
                />
              ) : (
                <p>
                  Take a breath beneath the canopy. Your next discovery awaits.
                </p>
              )}
            </aside>

            <aside
              className="ww-wildwood-lore ww-card"
              aria-label="Wildwood lore"
            >
              <h2>Whispers of Wildwood</h2>
              <p>
                Beneath the old trees, the trails shift and the forest grows
                quiet. Travelers sometimes find eggs tucked among the roots,
                untouched by footprints or fallen leaves.
              </p>
              <p>
                A name passes between the branches: Velune. No one has seen her.
                By dawn, only the eggs remain.
              </p>
            </aside>
          </div>

          <WildwoodInventory
            onPendingChange={setTreasurePending}
            userId={user?.id}
            eggs={partyDisplay.inventoryEggs.filter(
              (egg) => egg.user_id === user?.id,
            )}
            eggsLoading={partyDisplay.loading}
            eggsError={partyDisplay.error}
            refreshSignal={inventoryRevision}
            onRetryEggs={() => void partyDisplay.reload()}
          />

          <div
            ref={setSkillsTarget}
            className="pve-battle ww-skills-panel ww-card"
          >
            {!(room?.pveEnabled && battle) && (
              <WildwoodSkillsChamber
                key={chamberPet?.id ?? "no-kith"}
                petId={chamberPet?.id}
                refreshSignal={room?.sequence ?? 0}
              />
            )}
          </div>

          <div ref={setLogTarget} className="pve-battle ww-log-panel ww-card">
            {!(room?.pveEnabled && battle) && (
              <>
                <h2>Battle log</h2>
                <p>Combat events appear here during an encounter.</p>
              </>
            )}
          </div>

          <aside
            className="pve-battle ww-actions-column ww-card"
            aria-label="Wildwood actions"
          >
            <h2>Actions</h2>
            <div ref={setActionTarget} className="ww-confirm-action" />
            <div
              className="ww-explore-control"
              hidden={battle?.status === "active"}
            >
              <button
                type="button"
                className="dp-btn dp-btn--yellow"
                disabled={!canExplore}
                aria-describedby="ww-explore-reason"
                onClick={prepared ? explore : () => setPrepared(true)}
              >
                {busy
                  ? "Loading…"
                  : prepared
                    ? "Explore next path"
                    : "Enter Wildwood"}
              </button>
            </div>
            <p id="ww-explore-reason" className="ww-panel-note">
              {exploreReason ||
                "Explore with your first living Kith. Existing encounters are recovered automatically."}
            </p>
            <button
              type="button"
              className="ww-inventory-control"
              disabled={inventoryLocked}
              onClick={openInventory}
            >
              {inventoryLocked
                ? "Inventory unavailable right now"
                : "View inventory"}
            </button>
          </aside>
        </div>

        <RoamEncounterToast
          onWorkingChange={setCollecting}
          result={eggEncounter}
          onTaken={() => setInventoryRevision((value) => value + 1)}
          onDismiss={() => setEggEncounter(null)}
        />
      </main>
    </>
  );
}
