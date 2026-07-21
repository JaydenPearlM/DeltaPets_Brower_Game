// eggTypes.ts

import type { ElementLine } from "../../registry/creationTypes";
import { ELEMENT_EGG_NAMES, VOIDBORNE_EGG_NAME } from "@shared/pets/species";
import prismaticEgg from "./prismatic_egg.png";

export type EggType = {
  id: string;
  name: string;
  element: ElementLine;
  description: string;
  sprite?: string;
};

export const MYSTERY_EGG: EggType = {
  id: "mystery_egg",
  name: "Prismatic Egg",
  element: "null_element",
  description: "It keeps shaking, seems like it will hatch soon",
  sprite: prismaticEgg,
};

export const EGG_TYPES: EggType[] = [
  {
    id: "abyssal_pearl",
    name: ELEMENT_EGG_NAMES.water,
    element: "water",
    description: "Cold to the touch. You can hear distant tides inside.",
  },
  {
    id: "cinder_core",
    name: ELEMENT_EGG_NAMES.fire,
    element: "fire",
    description: "Warm pulses radiate from beneath its cracked shell.",
  },
  {
    id: "terra_bulwark",
    name: ELEMENT_EGG_NAMES.earth,
    element: "earth",
    description: "Heavy and unmoving. Feels older than stone.",
  },
  {
    id: "zephyr_pod",
    name: ELEMENT_EGG_NAMES.air,
    element: "air",
    description: "It vibrates faintly, like it's resisting gravity.",
  },
  {
    id: "frostbound_relic",
    name: ELEMENT_EGG_NAMES.ice,
    element: "ice",
    description: "Encased in crystalline chill that never melts.",
  },
  {
    id: "tempest_ova",
    name: ELEMENT_EGG_NAMES.storm,
    element: "storm",
    description: "Tiny arcs of static flicker across its surface.",
  },
  {
    id: "solstice_embryo",
    name: ELEMENT_EGG_NAMES.light,
    element: "light",
    description: "Soft radiance leaks from hairline fractures.",
  },
  {
    id: "nocturne_vessel",
    name: ELEMENT_EGG_NAMES.shadow,
    element: "shadow",
    description: "It seems darker than the space around it.",
  },
  {
    id: "void_chrysalis",
    name: VOIDBORNE_EGG_NAME,
    element: "null_element",
    description: "Weightless. Soundless. It reflects nothing, not even light.",
  },
  {
    id: "MYSTERY_EGG",
    name: "Prismatic Egg",
    element: "null_element",
    description:
      "Unstable. Shifting. No known origin. Its element is revealed at hatch.",
  },
];
