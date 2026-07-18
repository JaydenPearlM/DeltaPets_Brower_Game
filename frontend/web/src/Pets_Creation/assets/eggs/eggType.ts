// eggTypes.ts

import type { ElementLine } from "../../registry/creationTypes";

import prismaticEgg from "./prismatic_egg.png";
import eclipseEgg from "./eclipse_egg.png";
import dawnshardEgg from "./light.png";
import stormEgg from "./storm.png";
import frostveilEgg from "./frostviel_egg.png";
import zephyrEgg from "./zephr_egg.png";
import groveEgg from "./grove_egg.png";
import emberEgg from "./ember_egg.png";
import tideEgg from "./tide_egg.png";
import nullEgg from "./Voidborne_egg.png";

export type EggType = {
  id: string;
  name: string;
  element: ElementLine;
  description: string;
  sprite?: string;
};

export const MYSTERY_EGG: EggType = {
  id: "mystery_egg",
  name: "Prismatic Unknown",
  element: "null_element",
  description: "It keeps shaking, seems like it will hatch soon",
  sprite: prismaticEgg,
};

export const EGG_IMAGES: Record<string, string> = {
  water: tideEgg,
  fire: emberEgg,
  earth: groveEgg,
  air: zephyrEgg,
  ice: frostveilEgg,
  storm: stormEgg,
  light: dawnshardEgg,
  shadow: eclipseEgg,
  null: nullEgg,
  null_element: nullEgg,
  mystery: prismaticEgg,
};

export const MYSTERY_EGG_IMAGE = prismaticEgg;

export function getEggImage(line?: string | null): string {
  const key = String(line ?? "")
    .trim()
    .toLowerCase();
  return EGG_IMAGES[key] ?? prismaticEgg;
}

export const EGG_TYPES: EggType[] = [
  {
    id: "abyssal_pearl",
    name: "Abyssal Pearl",
    element: "water",
    description: "Cold to the touch. You can hear distant tides inside.",
    sprite: tideEgg,
  },
  {
    id: "ember_core",
    name: "Ember Core",
    element: "fire",
    description: "Warm pulses radiate from beneath its cracked shell.",
    sprite: emberEgg,
  },
  {
    id: "terra_grove",
    name: "Terra Grove",
    element: "earth",
    description: "Heavy and unmoving. Feels older than stone.",
    sprite: groveEgg,
  },
  {
    id: "zephyr_egg",
    name: "Zephyr Egg",
    element: "air",
    description: "It vibrates faintly, like it's resisting gravity.",
    sprite: zephyrEgg,
  },
  {
    id: "frostveil_egg",
    name: "Frostveil Egg",
    element: "ice",
    description: "Encased in crystalline chill that never melts.",
    sprite: frostveilEgg,
  },
  {
    id: "tempest_storm",
    name: "Tempest Storm",
    element: "storm",
    description: "Tiny arcs of static flicker across its surface.",
    sprite: stormEgg,
  },
  {
    id: "dawnshard_chrysalis",
    name: "Dawnshard Chrysalis",
    element: "light",
    description: "Soft radiance leaks from hairline fractures.",
    sprite: dawnshardEgg,
  },
  {
    id: "eclipse_egg",
    name: "Eclipse Egg",
    element: "shadow",
    description: "It seems darker than the space around it.",
    sprite: eclipseEgg,
  },
  {
    id: "void_chrysalis",
    name: "Void Chrysalis",
    element: "null_element",
    description: "Weightless. Soundless. It reflects nothing, not even light.",
    sprite: nullEgg,
  },
  {
    id: "mystery_egg",
    name: "Prismatic Unknown",
    element: "null_element",
    description:
      "Unstable. Shifting. No known origin. Its element is revealed at hatch.",
    sprite: prismaticEgg,
  },
];
