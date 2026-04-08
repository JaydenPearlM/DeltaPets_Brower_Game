// eggTypes.ts

import type { ElementLine } from "../../registry/creationTypes";
import goldEgg from "./goldEgg.png";

// adjust path if needed

export type EggType = {
  id: string;
  name: string;
  element: ElementLine;
  description: string;
  sprite?: string; //some eggs dont have a sprite yet
};

export const MYSTERY_EGG: EggType = {
  id: "mystery_egg",
  name: "Prismatic Unknown",
  element: "hidden",
  description: "Unstable. Shifting. No known origin.",
  sprite: goldEgg,
};

export const EGG_TYPES: EggType[] = [
  {
    id: "abyssal_pearl",
    name: "Abyssal Pearl",
    element: "water",
    description: "Cold to the touch. You can hear distant tides inside.",
  },
  {
    id: "cinder_core",
    name: "Cinder Core",
    element: "fire",
    description: "Warm pulses radiate from beneath its cracked shell.",
  },
  {
    id: "terra_bulwark",
    name: "Terra Bulwark",
    element: "earth",
    description: "Heavy and unmoving. Feels older than stone.",
  },
  {
    id: "zephyr_pod",
    name: "Zephyr Pod",
    element: "air",
    description: "It vibrates faintly, like it's resisting gravity.",
  },
  {
    id: "frostbound_relic",
    name: "Frostbound",
    element: "ice",
    description: "Encased in crystalline chill that never melts.",
  },
  {
    id: "tempest_ova",
    name: "Tempest Ova",
    element: "storm",
    description: "Tiny arcs of static flicker across its surface.",
  },
  {
    id: "solstice_embryo",
    name: "Solstice Embryo",
    element: "light",
    description: "Soft radiance leaks from hairline fractures.",
  },
  {
    id: "nocturne_vessel",
    name: "Nocturne Vessel",
    element: "shadow",
    description: "It seems darker than the space around it.",
  },
  {
    id: "void_chrysalis",
    name: "Void Chrysalis",
    element: "null_element",
    description: "Weightless. Soundless. It reflects nothing — not even light.",
  },
  {
    id: "MYSTERY_EGG",
    name: "Prismatic Unknown",
    element: "null_element",
    description:
      "Unstable. Shifting. No known origin. Its element is revealed at hatch.",
  },
];
