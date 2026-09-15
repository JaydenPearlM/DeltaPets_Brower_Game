import solenPortrait from "@/kith/assets/startepets/hatchling_solen.png";

import espyrPortrait from "@/kith/assets/startepets/hatchling_espyr.png";

import cribiPortrait from "@/kith/assets/startepets/hatchling_cribi.png";

import kindlekinPortrait from "@/kith/assets/startepets/hatchling_kindlekin.png";

import mizuPortrait from "@/kith/assets/startepets/hatchling_mizu.png";

import twigletPortrait from "@/kith/assets/startepets/hatchling_twiglet.png";

import volbPortrait from "@/kith/assets/startepets/hatchling_volb.png";
import wistpipPortrait from "@/kith/assets/startepets/hatchling_whistpip.png";

const STARTER_PORTRAITS: Readonly<Record<string, string>> = {
  fire_starter: kindlekinPortrait,
  kindlekin: kindlekinPortrait,
  moltikyn: kindlekinPortrait,
  magnakyn: kindlekinPortrait,
  lavakyn: kindlekinPortrait,

  water_starter: mizuPortrait,
  mizu: mizuPortrait,
  mizule: mizuPortrait,
  zulelon: mizuPortrait,
  aquilyth: mizuPortrait,

  earth_starter: twigletPortrait,
  twiglet: twigletPortrait,
  rootle: twigletPortrait,
  radaroot: twigletPortrait,
  roovine: twigletPortrait,

  air_starter: wistpipPortrait,
  wistpip: wistpipPortrait,
  whistpip: wistpipPortrait,
  whispit: wistpipPortrait,
  zephyx: wistpipPortrait,
  phyxlion: wistpipPortrait,
  phyxion: wistpipPortrait,

  ice_starter: cribiPortrait,
  cribi: cribiPortrait,
  cribit: cribiPortrait,
  crabbit: cribiPortrait,
  crionyx: cribiPortrait,

  storm_starter: volbPortrait,
  volb: volbPortrait,
  voltlet: volbPortrait,
  tovote: volbPortrait,
  voltaris: volbPortrait,

  light_starter: solenPortrait,
  solen: solenPortrait,
  solkit: solenPortrait,
  solaryn: solenPortrait,
  angelyx: solenPortrait,

  shadow_night_bad: espyrPortrait,
  shadow_day_good: espyrPortrait,
  espyr: espyrPortrait,
  esperon: espyrPortrait,
  noctimp: espyrPortrait,
  nightmareimp: espyrPortrait,
  espereonite: espyrPortrait,
  flareclaw: espyrPortrait,
  shadeclaw: espyrPortrait,
  nightvielclaw: espyrPortrait,
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

export {
  cribiPortrait,
  espyrPortrait,
  kindlekinPortrait,
  mizuPortrait,
  solenPortrait,
  twigletPortrait,
  volbPortrait,
};
