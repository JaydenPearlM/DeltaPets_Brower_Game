import type {
  ResonanceElement,
  ResonanceElementConfig,
} from "./resonanceEvolution.types";

export const ELEMENT_RESONANCE: Readonly<
  Record<ResonanceElement, ResonanceElementConfig>
> = {
  fire: {
    color: "#ff6b2c",
    accent: "#ffd06a",
    rune: "△",
    iconPath: "/assets/resonance-elements/fire.png",
    effect: "fire",
  },
  water: {
    color: "#39a9ff",
    accent: "#b9efff",
    rune: "◒",
    iconPath: "/assets/resonance-elements/water.png",
    effect: "water",
  },
  earth: {
    color: "#6ed56c",
    accent: "#c7e68f",
    rune: "⬢",
    iconPath: "/assets/resonance-elements/earth.png",
    effect: "earth",
  },
  air: {
    color: "#a9efff",
    accent: "#f0fdff",
    rune: "⌁",
    iconPath: "/assets/resonance-elements/air.png",
    effect: "air",
  },
  ice: {
    color: "#8cdcff",
    accent: "#eefcff",
    rune: "✦",
    iconPath: "/assets/resonance-elements/ice.png",
    effect: "ice",
  },
  storm: {
    color: "#ffd83d",
    accent: "#56dfff",
    rune: "ϟ",
    iconPath: "/assets/resonance-elements/storm.png",
    effect: "storm",
  },
  light: {
    color: "#ffe7a0",
    accent: "#ffffff",
    rune: "☼",
    iconPath: "/assets/resonance-elements/light.png",
    effect: "light",
  },
  shadow: {
    color: "#a66cff",
    accent: "#d7b9ff",
    rune: "◐",
    iconPath: "/assets/resonance-elements/shadow.png",
    effect: "shadow",
  },
  voidborne: {
    color: "#ff4fd8",
    accent: "#8d61ff",
    rune: "◇",
    iconPath: "/assets/resonance-elements/voidborne.png",
    effect: "voidborne",
  },
};

export function normalizeResonanceElement(
  value: string | null | undefined,
): ResonanceElement {
  const normalized = String(value ?? "").trim().toLowerCase();

  if (normalized === "null_element" || normalized === "voidborne") {
    return "voidborne";
  }

  if (normalized in ELEMENT_RESONANCE) {
    return normalized as ResonanceElement;
  }

  return "light";
}
