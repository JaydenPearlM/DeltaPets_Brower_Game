import solenPortrait from "@/kith/assets/startepets/hatchlings/hatchling_solen.png";

import espyrPortrait from "@/kith/assets/startepets/hatchlings/hatchling_espyr.png";

import cribiPortrait from "@/kith/assets/startepets/hatchlings/hatchling_cribi.png";
import cribitPortrait from "@/kith/assets/startepets/lowform/lowform_cribit.png";

import kindlekinPortrait from "@/kith/assets/startepets/hatchlings/hatchling_kindlekin.png";

import mizuPortrait from "@/kith/assets/startepets/hatchlings/hatchling_mizu.png";

import twigletPortrait from "@/kith/assets/startepets/hatchlings/hatchling_twiglet.png";

import volbPortrait from "@/kith/assets/startepets/hatchlings/hatchling_volb.png";
import wistpipPortrait from "@/kith/assets/startepets/hatchlings/hatchling_whistpip.png";
import moltikynPortrait from "@/kith/assets/startepets/lowform/lowform_moltikin.png";
import mizulePortrait from "@/kith/assets/startepets/lowform/lowform_mizulite.png";
import rootlePortrait from "@/kith/assets/startepets/lowform/lowform_treeflip.png";
import zephyxPortrait from "@/kith/assets/startepets/lowform/lowform_wimora.png";
import voltletPortrait from "@/kith/assets/startepets/lowform/lowform_voltaire.png";
import solkitPortrait from "@/kith/assets/startepets/lowform/lowform_solite.png";
import noctimpPortrait from "@/kith/assets/startepets/lowform/lowform_BadP_Espyrian.png";
import flareclawPortrait from "@/kith/assets/startepets/lowform/lowform_GoodP_Espyrian.png";

const STARTER_PORTRAITS: Readonly<Record<string, string>> = {
  fire_starter: kindlekinPortrait,
  kindlekin: kindlekinPortrait,
  moltikyn: moltikynPortrait,
  magnakyn: kindlekinPortrait,
  lavakyn: kindlekinPortrait,

  water_starter: mizuPortrait,
  mizu: mizuPortrait,
  mizule: mizulePortrait,
  zulelon: mizuPortrait,
  aquilyth: mizuPortrait,

  earth_starter: twigletPortrait,
  twiglet: twigletPortrait,
  rootle: rootlePortrait,
  radaroot: twigletPortrait,
  roovine: twigletPortrait,

  air_starter: wistpipPortrait,
  wistpip: wistpipPortrait,
  whistpip: wistpipPortrait,
  whispit: wistpipPortrait,
  zephyx: zephyxPortrait,
  phyxlion: wistpipPortrait,
  phyxion: wistpipPortrait,

  ice_starter: cribiPortrait,
  cribi: cribiPortrait,
  cribit: cribitPortrait,
  crabbit: cribiPortrait,
  crionyx: cribiPortrait,

  storm_starter: volbPortrait,
  volb: volbPortrait,
  voltlet: voltletPortrait,
  tovote: volbPortrait,
  voltaris: volbPortrait,

  light_starter: solenPortrait,
  solen: solenPortrait,
  solkit: solkitPortrait,
  solaryn: solenPortrait,
  angelyx: solenPortrait,

  shadow_night_bad: espyrPortrait,
  shadow_day_good: espyrPortrait,
  espyr: espyrPortrait,
  esperon: espyrPortrait,
  noctimp: noctimpPortrait,
  nightmareimp: espyrPortrait,
  espereonite: espyrPortrait,
  flareclaw: flareclawPortrait,
  shadeclaw: espyrPortrait,
  nightvielclaw: espyrPortrait,
};

export function getStarterPortrait(species?: string | null, stage?: string | null) {
  if (stage?.trim().toLowerCase() === "lowform") {
    const path = species?.trim().toLowerCase();
    if (path === "shadow_night_bad") return noctimpPortrait;
    if (path === "shadow_day_good") return flareclawPortrait;
  }
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
