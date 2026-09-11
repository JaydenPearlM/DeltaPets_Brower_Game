import solenPortrait from "@/kith/assets/startepets/hatchling_solen.png";

import espyrPortrait from "@/kith/assets/startepets/hatchling_espyr.png";

import cribiPortrait from "@/kith/assets/startepets/hatchling_cribi.png";

import kindlekinPortrait from "@/kith/assets/startepets/hatchling_kindlekin.png";

const STARTER_PORTRAITS: Readonly<Record<string, string>> = {
  fire_starter: kindlekinPortrait,
  kindlekin: kindlekinPortrait,

  light_starter: solenPortrait,
  solen: solenPortrait,

  shadow_night_bad: espyrPortrait,
  shadow_day_good: espyrPortrait,
  espyr: espyrPortrait,
  esperon: espyrPortrait,

  ice_starter: cribiPortrait,
  cribi: cribiPortrait,
};

export function getStarterPortrait(species?: string | null) {
  return (
    STARTER_PORTRAITS[
      String(species ?? "")
        .trim()
        .toLowerCase()
    ] ?? null
  );
}

export { cribiPortrait, espyrPortrait, kindlekinPortrait, solenPortrait };
