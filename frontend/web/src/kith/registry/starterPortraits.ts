import solenPortrait from "@/kith/assets/startepets/hatchling_solen.png";

import espyrPortrait from "@/kith/assets/startepets/hatchling_espyr.png";

import cribiPortrait from "@/kith/assets/startepets/hatchling_cribi.png";

const STARTER_PORTRAITS: Readonly<Record<string, string>> = {
  light_starter: solenPortrait,
  shadow_night_bad: espyrPortrait,
  shadow_day_good: espyrPortrait,
  ice_starter: cribiPortrait,
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

export { cribiPortrait, espyrPortrait, solenPortrait };
