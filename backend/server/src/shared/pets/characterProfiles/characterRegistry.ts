import type { CharacterProfile } from "./characterProfile.types";

import mizu from "./starters/mizu.json";
import kindlekin from "./starters/kindlekin.json";
import twiglet from "./starters/twiglet.json";
import wistpip from "./starters/wistpip.json";
import cribi from "./starters/cribi.json";
import volb from "./starters/volb.json";
import solen from "./starters/solen.json";
import esperon from "./starters/esperon.json";

import clodian from "./kithna/clodian.json";
import pebelin from "./kithna/pebelin.json";
import magmado from "./kithna/magmado.json";
import shade from "./kithna/shade.json";
import glimmer from "./kithna/glimmer.json";

export const CHARACTER_PROFILES: CharacterProfile[] = [
  mizu,
  kindlekin,
  twiglet,
  wistpip,
  cribi,
  volb,
  solen,
  esperon,
  clodian,
  pebelin,
  magmado,
  shade,
  glimmer,
];

export function findCharacterProfileBySpeciesId(
  speciesId: string | null | undefined,
): CharacterProfile | null {
  const normalized = String(speciesId ?? "").trim();

  if (!normalized) {
    return null;
  }

  return (
    CHARACTER_PROFILES.find((profile) =>
      profile.species_ids.includes(normalized),
    ) ?? null
  );
}
