import { env } from "../../env.server";
import { logger } from "../../lib/logger";
import {
  STARTER_SPROUTS,
  findStarterByName as findSharedStarterByName,
  getStarterSpeciesFromSelection,
  type SharedElementLine,
} from "../../shared/pets/species";

export type StarterDefinition = {
  speciesId: string;
  eggName: string;
  hatchlingName: string;
  lowformName: string;
  highformName: string;
  legionName: string;
  mythicalLegendaryName: string | null;
  line: SharedElementLine;
  variant?: "good" | "bad" | null;
  preferredTime?: "day" | "night" | null;
  baseStats: {
    hp: number;
    atk: number;
    magi: number;
    def: number;
    spd: number;
    mana: number;
    base_total: number;
  };
};

export type StarterSelectionInput = {
  line?: string | null;
  personalityKey?: string | null;
  worldTime?: "day" | "night" | null;
};

export const STARTERS: StarterDefinition[] = STARTER_SPROUTS.map((starter) => ({
  speciesId: starter.speciesId,
  eggName: starter.eggName,
  hatchlingName: starter.hatchlingName,
  lowformName: starter.lowformName,
  highformName: starter.highformName,
  legionName: starter.legionName,
  mythicalLegendaryName: starter.mythicalLegendaryName ?? null,
  line: starter.line,
  variant: starter.variant ?? null,
  preferredTime: starter.preferredTime ?? null,
  baseStats: starter.baseStats,
}));

export const STARTER_ANY_STAGE_NAMES = Array.from(
  new Set(
    STARTERS.flatMap((starter) =>
      [
        starter.eggName,
        starter.hatchlingName,
        starter.lowformName,
        starter.highformName,
        starter.legionName,
        starter.mythicalLegendaryName,
      ].filter((value): value is string => Boolean(value)),
    ),
  ),
);

export const STARTER_EGG_NAMES = Array.from(
  new Set(STARTERS.map((starter) => starter.eggName)),
);

export const STARTER_HATCHLING_NAMES = Array.from(
  new Set(STARTERS.map((starter) => starter.hatchlingName)),
);

export function findStarterByAnyName(
  name: string,
): StarterDefinition | undefined {
  return STARTERS.find((starter) =>
    [
      starter.eggName,
      starter.hatchlingName,
      starter.lowformName,
      starter.highformName,
      starter.legionName,
      starter.mythicalLegendaryName,
    ]
      .filter((value): value is string => Boolean(value))
      .includes(name),
  );
}

export function findStarterByEggName(
  name: string,
): StarterDefinition | undefined {
  return STARTERS.find((starter) => starter.eggName === name);
}

export function findStarterByHatchlingName(
  name: string,
): StarterDefinition | undefined {
  return STARTERS.find((starter) => starter.hatchlingName === name);
}

export function findStarterByName(name: string): StarterDefinition | undefined {
  const shared = findSharedStarterByName(name);
  if (!shared) return undefined;

  return STARTERS.find((starter) => starter.speciesId === shared.speciesId);
}

function isSharedElementLine(value: string): value is SharedElementLine {
  return [
    "null_element",
    "water",
    "fire",
    "earth",
    "air",
    "ice",
    "storm",
    "light",
    "shadow",
  ].includes(value);
}

export function normalizeStarterElementLine(
  line?: string | null,
): SharedElementLine {
  const candidate = (line ?? "").trim().toLowerCase();

  if (isSharedElementLine(candidate)) {
    return candidate;
  }

  return "water";
}

export function resolveStarterLine(
  input: StarterSelectionInput,
): SharedElementLine {
  return normalizeStarterElementLine(input.line);
}

export function getStarterForSelection(
  input: StarterSelectionInput,
): StarterDefinition {
  const normalizedLine = normalizeStarterElementLine(input.line);

  if (env.NODE_ENV !== "production") {
    logger.info("[intro] starter selection input", {
      requestedLine: input.line ?? null,
      resolvedLine: normalizedLine,
      worldTime: input.worldTime ?? null,
      personalityKey: input.personalityKey ?? null,
    });
  }

  const species = getStarterSpeciesFromSelection(
    normalizedLine,
    input.personalityKey ?? null,
    input.worldTime ?? null,
  );

  if (!species) {
    logger.error("[element] starter species resolution failed", {
      requestedLine: input.line ?? null,
      resolvedLine: normalizedLine,
      worldTime: input.worldTime ?? null,
      personalityKey: input.personalityKey ?? null,
    });

    throw new Error(
      `Could not resolve starter species for line: ${input.line ?? "unknown"}`,
    );
  }

  const starter = STARTERS.find((entry) => entry.speciesId === species.id);

  if (!starter) {
    logger.error("[element] starter definition missing", {
      speciesId: species.id,
      requestedLine: input.line ?? null,
      resolvedLine: normalizedLine,
    });

    throw new Error(
      `Could not resolve starter definition for species: ${species.id}`,
    );
  }

  logger.info("[element] starter resolved", {
    requestedLine: input.line ?? null,
    resolvedLine: normalizedLine,
    speciesId: starter.speciesId,
    eggName: starter.eggName,
  });

  return starter;
}

export const STARTER_NAMES = STARTER_ANY_STAGE_NAMES;

export function findStarterByStageName(
  name: string,
): StarterDefinition | undefined {
  return findStarterByAnyName(name);
}
