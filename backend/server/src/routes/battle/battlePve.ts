import { Router } from "express";
import type { Response } from "express";
import { randomUUID } from "crypto";
import { requireUser, type AuthedRequest } from "../../middleware/auth";
import { supabaseAdmin } from "../../lib/supabaseAdmin";
import { logger } from "../../lib/logger";

type BattleElement =
  | "fire"
  | "water"
  | "earth"
  | "air"
  | "ice"
  | "storm"
  | "light"
  | "shadow";

type BattleSide = "player" | "enemy";

type BattleUnit = {
  id: string;
  sourcePetId?: string;
  side: BattleSide;
  name: string;
  element: BattleElement;
  level: number;
  hpMax: number;
  hpCur: number;
  atk: number;
  def: number;
  spd: number;
  magi: number;
  turnMeter: number;
  guarding: boolean;
  status: {
    burn?: number;
    slow?: number;
    exposed?: number;
    weakened?: number;
    stunned?: number;
  };
};

type BattleState = {
  id: string;
  userId: string;
  mode: "pve";
  status: "active" | "victory" | "defeat";
  round: number;
  autoMode: boolean;
  activeUnitId: string | null;
  playerTeam: BattleUnit[];
  enemyTeam: BattleUnit[];
  log: string[];
  createdAt: string;
  updatedAt: string;
};

type PlayerActionBody = {
  action: "basic_attack" | "guard" | "skill";
  actorId: string;
  targetId?: string;
  skillId?: "element_strike" | "mend" | "weaken";
};

const battleStore = new Map<string, BattleState>();

const BATTLE_TTL_MS = 30 * 60 * 1000;

setInterval(
  () => {
    const now = Date.now();

    for (const [battleId, battle] of battleStore.entries()) {
      const updatedAt = new Date(battle.updatedAt).getTime();

      if (now - updatedAt > BATTLE_TTL_MS) {
        battleStore.delete(battleId);
      }
    }
  },
  5 * 60 * 1000,
);

const MAX_BATTLE_LOG_ENTRIES = 50;

export const battlePveRouter = Router();

const ELEMENTS: BattleElement[] = [
  "fire",
  "water",
  "earth",
  "air",
  "ice",
  "storm",
  "light",
  "shadow",
];

function clampHp(value: number, max: number) {
  return Math.max(0, Math.min(max, value));
}

function isAlive(unit: BattleUnit) {
  return unit.hpCur > 0;
}

function allUnits(state: BattleState) {
  return [...state.playerTeam, ...state.enemyTeam];
}

function getLivingUnits(state: BattleState, side: BattleSide) {
  return allUnits(state).filter((unit) => unit.side === side && isAlive(unit));
}

function getEnemySide(side: BattleSide): BattleSide {
  return side === "player" ? "enemy" : "player";
}

function getElementMultiplier(
  attacker: BattleElement,
  defender: BattleElement,
) {
  const strongAgainst: Record<BattleElement, BattleElement[]> = {
    fire: ["earth", "ice"],
    water: ["fire"],
    earth: ["air", "storm"],
    air: ["water"],
    ice: ["air"],
    storm: ["water"],
    light: ["shadow"],
    shadow: ["light"],
  };

  const weakAgainst: Record<BattleElement, BattleElement[]> = {
    fire: ["water"],
    water: ["air", "storm"],
    earth: ["fire", "ice"],
    air: ["earth", "ice"],
    ice: ["fire"],
    storm: ["earth"],
    light: ["shadow"],
    shadow: ["light"],
  };

  if (strongAgainst[attacker]?.includes(defender)) return 1.25;
  if (weakAgainst[attacker]?.includes(defender)) return 0.85;

  return 1;
}

function calculateDamage(params: {
  attacker: BattleUnit;
  defender: BattleUnit;
  power: number;
  useMagi?: boolean;
  elemental?: boolean;
}) {
  const { attacker, defender, power, useMagi, elemental } = params;

  const offense = useMagi ? attacker.magi : attacker.atk;
  const defense = defender.guarding ? defender.def * 1.35 : defender.def;

  const exposedBonus = defender.status.exposed ? 1.2 : 1;
  const weakenedPenalty = attacker.status.weakened ? 0.8 : 1;
  const elementBonus = elemental
    ? getElementMultiplier(attacker.element, defender.element)
    : 1;

  const raw =
    offense * power * weakenedPenalty * exposedBonus * elementBonus -
    defense * 0.45;

  return Math.max(1, Math.round(raw));
}

function applyStartOfTurnEffects(state: BattleState, unit: BattleUnit) {
  unit.guarding = false;

  if (unit.status.burn && unit.status.burn > 0) {
    const burnDamage = Math.max(1, Math.round(unit.hpMax * 0.06));
    unit.hpCur = clampHp(unit.hpCur - burnDamage, unit.hpMax);
    unit.status.burn -= 1;

    state.log.push(`${unit.name} takes ${burnDamage} burn damage.`);
  }

  for (const key of ["slow", "exposed", "weakened", "stunned"] as const) {
    if (unit.status[key] && unit.status[key]! > 0) {
      unit.status[key]! -= 1;

      if (unit.status[key]! <= 0) {
        delete unit.status[key];
      }
    }
  }
}

function pickNextUnit(state: BattleState) {
  if (state.status !== "active") return null;

  const living = allUnits(state).filter(isAlive);

  while (true) {
    for (const unit of living) {
      const speedPenalty = unit.status.slow ? 0.65 : 1;
      unit.turnMeter += Math.max(5, unit.spd * speedPenalty);
    }

    const ready = living
      .filter((unit) => unit.turnMeter >= 100)
      .sort((a, b) => b.turnMeter - a.turnMeter || b.spd - a.spd)[0];

    if (ready) {
      ready.turnMeter = 0;
      return ready;
    }
  }
}

function trimBattleLog(state: BattleState) {
  if (state.log.length > MAX_BATTLE_LOG_ENTRIES) {
    state.log = state.log.slice(-MAX_BATTLE_LOG_ENTRIES);
  }
}

function checkBattleEnd(state: BattleState) {
  const playersAlive = getLivingUnits(state, "player").length > 0;
  const enemiesAlive = getLivingUnits(state, "enemy").length > 0;

  if (!enemiesAlive) {
    state.status = "victory";
    state.activeUnitId = null;
    state.log.push("Victory! Enemy team defeated.");
  }

  if (!playersAlive) {
    state.status = "defeat";
    state.activeUnitId = null;
    state.log.push("Defeat. Your team was knocked out.");
  }
}

function advanceBattle(state: BattleState) {
  checkBattleEnd(state);
  if (state.status !== "active") return;

  let next = pickNextUnit(state);

  if (!next) return;

  applyStartOfTurnEffects(state, next);
  checkBattleEnd(state);

  if (state.status !== "active") return;

  if (next.status.stunned && next.status.stunned > 0) {
    state.log.push(`${next.name} is stunned and loses their turn.`);
    next.status.stunned -= 1;
    advanceBattle(state);
    return;
  }

  state.activeUnitId = next.id;
  state.updatedAt = new Date().toISOString();

  if (next.side === "enemy" || state.autoMode) {
    runAiTurn(state, next);
    advanceBattle(state);
  }
}

function getUnitById(state: BattleState, unitId: string) {
  return allUnits(state).find((unit) => unit.id === unitId) ?? null;
}

function getDefaultTarget(state: BattleState, actor: BattleUnit) {
  const enemies = getLivingUnits(state, getEnemySide(actor.side));
  return enemies.sort((a, b) => a.hpCur - b.hpCur)[0] ?? null;
}

function performBasicAttack(
  state: BattleState,
  actor: BattleUnit,
  target: BattleUnit,
) {
  const damage = calculateDamage({
    attacker: actor,
    defender: target,
    power: 1,
  });

  target.hpCur = clampHp(target.hpCur - damage, target.hpMax);

  state.log.push(`${actor.name} attacks ${target.name} for ${damage} damage.`);
}

function performGuard(state: BattleState, actor: BattleUnit) {
  actor.guarding = true;
  state.log.push(`${actor.name} guards and braces for impact.`);
}

function performSkill(
  state: BattleState,
  actor: BattleUnit,
  target: BattleUnit,
  skillId: PlayerActionBody["skillId"],
) {
  if (skillId === "mend") {
    const allyTarget = target.side === actor.side ? target : actor;
    const heal = Math.max(4, Math.round(actor.magi * 1.25 + actor.level * 2));

    allyTarget.hpCur = clampHp(allyTarget.hpCur + heal, allyTarget.hpMax);
    state.log.push(`${actor.name} mends ${allyTarget.name} for ${heal} HP.`);
    return;
  }

  if (skillId === "weaken") {
    target.status.weakened = 2;
    target.status.exposed = 1;
    state.log.push(`${actor.name} weakens ${target.name}.`);
    return;
  }

  const damage = calculateDamage({
    attacker: actor,
    defender: target,
    power: 1.25,
    useMagi: true,
    elemental: true,
  });

  target.hpCur = clampHp(target.hpCur - damage, target.hpMax);

  if (actor.element === "fire") target.status.burn = 2;
  if (actor.element === "water" || actor.element === "ice")
    target.status.slow = 2;
  if (actor.element === "storm")
    target.turnMeter = Math.max(0, target.turnMeter - 25);
  if (actor.element === "shadow") target.status.weakened = 2;
  if (actor.element === "light")
    actor.hpCur = clampHp(actor.hpCur + Math.round(damage * 0.25), actor.hpMax);

  state.log.push(
    `${actor.name} uses Element Strike on ${target.name} for ${damage} damage.`,
  );
}

function runAiTurn(state: BattleState, actor: BattleUnit) {
  const enemies = getLivingUnits(state, getEnemySide(actor.side));
  const allies = getLivingUnits(state, actor.side);

  if (!isAlive(actor) || enemies.length === 0) return;

  const lowAlly = allies.find((ally) => ally.hpCur / ally.hpMax <= 0.35);

  if (actor.magi >= actor.atk && lowAlly && actor.side === "player") {
    performSkill(state, actor, lowAlly, "mend");
    return;
  }

  const target = enemies.sort((a, b) => a.hpCur - b.hpCur)[0];

  if (actor.hpCur / actor.hpMax <= 0.25 && actor.def >= actor.atk) {
    performGuard(state, actor);
    return;
  }

  if (actor.magi >= actor.atk || Math.random() > 0.55) {
    performSkill(state, actor, target, "element_strike");
    return;
  }

  performBasicAttack(state, actor, target);
}

function createEnemyTeam(playerLevelAverage: number): BattleUnit[] {
  return Array.from({ length: 4 }).map((_, index) => {
    const level = Math.max(
      1,
      playerLevelAverage + Math.floor(Math.random() * 3) - 1,
    );
    const element = ELEMENTS[Math.floor(Math.random() * ELEMENTS.length)];

    return {
      id: `enemy-${index + 1}-${randomUUID()}`,
      side: "enemy",
      name: `Wild Kith ${index + 1}`,
      element,
      level,
      hpMax: 24 + level * 6,
      hpCur: 24 + level * 6,
      atk: 6 + level * 2,
      def: 5 + level * 2,
      spd: 5 + level * 2,
      magi: 5 + level * 2,
      turnMeter: 0,
      guarding: false,
      status: {},
    };
  });
}

function normalizePetToBattleUnit(pet: any, index: number): BattleUnit {
  const hpMax = Number(pet.hp_max ?? pet.hpMax ?? 30);
  const hpCur = Number(pet.hp_cur ?? pet.hpCur ?? hpMax);
  const rawElement = String(pet.element ?? pet.line ?? "fire");
  const element = ELEMENTS.includes(rawElement as BattleElement)
    ? (rawElement as BattleElement)
    : "fire";

  return {
    id: `player-${index + 1}-${pet.id}`,
    sourcePetId: pet.id,
    side: "player",
    name: pet.name ?? `Kith ${index + 1}`,
    element,
    level: Number(pet.level ?? 1),
    hpMax,
    hpCur: clampHp(hpCur, hpMax),
    atk: Number(pet.atk ?? 5),
    def: Number(pet.def ?? 5),
    spd: Number(pet.spd ?? 5),
    magi: Number(pet.magi ?? 5),
    turnMeter: 0,
    guarding: false,
    status: {},
  };
}

/**
 * POST /api/battle/pve/start
 *
 * Body:
 * {
 *   "petIds": ["uuid1", "uuid2", "uuid3", "uuid4"]
 * }
 */
battlePveRouter.post(
  "/start",
  requireUser,
  async (req: AuthedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      const petIds = Array.isArray(req.body?.petIds) ? req.body.petIds : [];

      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      if (petIds.length < 1 || petIds.length > 4) {
        return res.status(400).json({
          error: "PVE battles require 1 to 4 petIds.",
        });
      }

      const { data: pets, error } = await supabaseAdmin
        .from("pets")
        .select(
          [
            "id",
            "user_id",
            "name",
            "stage",
            "level",
            "xp",
            "atk",
            "def",
            "spd",
            "hp_max",
            "hp_cur",
            "magi",
            "personality_id",
            "line",
          ].join(", "),
        )
        .eq("user_id", userId)
        .in("id", petIds);

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      if (!pets || pets.length !== petIds.length) {
        return res.status(404).json({
          error: "One or more pets were not found for this user.",
        });
      }

      const playerTeam = pets.map(normalizePetToBattleUnit);
      const avgLevel = Math.max(
        1,
        Math.round(
          playerTeam.reduce((sum, pet) => sum + pet.level, 0) /
            playerTeam.length,
        ),
      );

      const now = new Date().toISOString();

      const state: BattleState = {
        id: randomUUID(),
        userId,
        mode: "pve",
        status: "active",
        round: 1,
        autoMode: false,
        activeUnitId: null,
        playerTeam,
        enemyTeam: createEnemyTeam(avgLevel),
        log: ["A wild enemy team appears."],
        createdAt: now,
        updatedAt: now,
      };

      advanceBattle(state);
      trimBattleLog(state);
      battleStore.set(state.id, state);

      return res.status(201).json({ battle: state });
    } catch (err) {
      logger.error("[POST /api/battle/pve/start]", err);
      return res.status(500).json({ error: "Failed to start PVE battle." });
    }
  },
);

/**
 * GET /api/battle/pve/:battleId
 */
battlePveRouter.get(
  "/:battleId",
  requireUser,
  async (req: AuthedRequest, res: Response) => {
    const userId = req.user?.id;
    const battle = battleStore.get(req.params.battleId);

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!battle || battle.userId !== userId) {
      return res.status(404).json({ error: "Battle not found." });
    }

    return res.json({ battle });
  },
);

/**
 * PATCH /api/battle/pve/:battleId/auto
 *
 * Body:
 * {
 *   "autoMode": true
 * }
 */
battlePveRouter.patch(
  "/:battleId/auto",
  requireUser,
  async (req: AuthedRequest, res: Response) => {
    const userId = req.user?.id;
    const battle = battleStore.get(req.params.battleId);

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!battle || battle.userId !== userId) {
      return res.status(404).json({ error: "Battle not found." });
    }

    battle.autoMode = Boolean(req.body?.autoMode);
    battle.log.push(`Auto Mode ${battle.autoMode ? "enabled" : "disabled"}.`);

    if (battle.autoMode) {
      advanceBattle(battle);
    }

    trimBattleLog(battle);

    return res.json({ battle });
  },
);

/**
 * POST /api/battle/pve/:battleId/action
 *
 * Body:
 * {
 *   "actorId": "player-1-pet_uuid",
 *   "action": "basic_attack",
 *   "targetId": "enemy-1-uuid"
 * }
 *
 * Skills:
 * {
 *   "actorId": "...",
 *   "action": "skill",
 *   "skillId": "element_strike",
 *   "targetId": "..."
 * }
 */
battlePveRouter.post(
  "/:battleId/action",
  requireUser,
  async (req: AuthedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      const battle = battleStore.get(req.params.battleId);
      const body = req.body as PlayerActionBody;

      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      if (!battle || battle.userId !== userId) {
        return res.status(404).json({ error: "Battle not found." });
      }

      if (battle.status !== "active") {
        return res.status(400).json({ error: "Battle is already finished." });
      }

      const actor = getUnitById(battle, body.actorId);

      if (!actor || actor.side !== "player") {
        return res.status(400).json({ error: "Invalid player actor." });
      }

      if (battle.activeUnitId !== actor.id) {
        return res.status(400).json({
          error: "It is not this pet's turn.",
          activeUnitId: battle.activeUnitId,
        });
      }

      if (!isAlive(actor)) {
        return res.status(400).json({ error: "Actor is knocked out." });
      }

      const target = body.targetId
        ? getUnitById(battle, body.targetId)
        : getDefaultTarget(battle, actor);

      if (!target) {
        return res.status(400).json({ error: "No valid target found." });
      }

      if (body.action === "basic_attack") {
        if (target.side === actor.side) {
          return res
            .status(400)
            .json({ error: "Basic attack needs an enemy target." });
        }

        performBasicAttack(battle, actor, target);
      } else if (body.action === "guard") {
        performGuard(battle, actor);
      } else if (body.action === "skill") {
        performSkill(battle, actor, target, body.skillId ?? "element_strike");
      } else {
        return res.status(400).json({ error: "Unknown action." });
      }

      battle.activeUnitId = null;
      battle.updatedAt = new Date().toISOString();

      checkBattleEnd(battle);

      if (battle.status === "active") {
        advanceBattle(battle);
      }

      trimBattleLog(battle);

      return res.json({ battle });
    } catch (err) {
      logger.error("[POST /api/battle/pve/:battleId/action]", err);
      return res
        .status(500)
        .json({ error: "Failed to perform battle action." });
    }
  },
);
