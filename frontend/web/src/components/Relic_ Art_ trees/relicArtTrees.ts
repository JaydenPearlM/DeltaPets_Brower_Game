export type RelicArtElement =
  | "water"
  | "fire"
  | "earth"
  | "air"
  | "ice"
  | "storm"
  | "light"
  | "shadow"
  | "voidborne";

export type RelicArtNodeKind = "art" | "support" | "passive" | "stat";

export const RELIC_ELEMENT_LABELS: Record<RelicArtElement, string> = {
  water: "Water",
  fire: "Fire",
  earth: "Earth",
  air: "Air",
  ice: "Ice",
  storm: "Storm",
  light: "Light",
  shadow: "Shadow",
  voidborne: "Voidborne",
};

export function canPetUseRelicElement(
  petElements: readonly RelicArtElement[],
  relicElement: RelicArtElement,
) {
  return petElements.includes(relicElement);
}

export type RelicArtNode = {
  id: string;
  x: number;
  y: number;
  kind: RelicArtNodeKind;
  requires: string[];
  etchingSocket?: boolean;
};

export type RelicArtTreeDefinition = {
  element: RelicArtElement;
  nodes: RelicArtNode[];
};

const node = (
  id: string,
  x: number,
  y: number,
  kind: RelicArtNodeKind,
  requires: string[],
  etchingSocket = false,
): RelicArtNode => ({ id, x, y, kind, requires, etchingSocket });

export const RELIC_ART_TREES: Record<RelicArtElement, RelicArtTreeDefinition> =
  {
    water: {
      element: "water",
      nodes: [
        node("water-01", 50, 50, "art", []),
        node("water-02", 37, 41, "support", ["water-01"], true),
        node("water-03", 63, 41, "support", ["water-01"], true),
        node("water-04", 31, 57, "stat", ["water-02"]),
        node("water-05", 50, 66, "art", ["water-02", "water-03"], true),
        node("water-06", 69, 57, "stat", ["water-03"]),
        node("water-07", 25, 38, "passive", ["water-02"]),
        node("water-08", 50, 27, "art", ["water-02", "water-03"], true),
        node("water-09", 75, 38, "passive", ["water-03"]),
        node("water-10", 36, 75, "support", ["water-04", "water-05"]),
        node("water-11", 64, 75, "support", ["water-05", "water-06"]),
        node("water-12", 50, 86, "art", ["water-10", "water-11"], true),
      ],
    },

    fire: {
      element: "fire",
      nodes: [
        node("fire-01", 50, 50, "art", []),
        node("fire-02", 50, 34, "stat", ["fire-01"], true),
        node("fire-03", 66, 42, "art", ["fire-01"], true),
        node("fire-04", 67, 60, "passive", ["fire-03"]),
        node("fire-05", 50, 68, "art", ["fire-01"], true),
        node("fire-06", 33, 60, "stat", ["fire-05"]),
        node("fire-07", 34, 42, "passive", ["fire-01"]),
        node("fire-08", 50, 20, "art", ["fire-02"], true),
        node("fire-09", 80, 35, "support", ["fire-03"]),
        node("fire-10", 78, 71, "art", ["fire-04", "fire-05"], true),
        node("fire-11", 22, 71, "art", ["fire-05", "fire-06"], true),
        node("fire-12", 20, 35, "support", ["fire-07"]),
      ],
    },

    earth: {
      element: "earth",
      nodes: [
        node("earth-01", 50, 50, "art", []),
        node("earth-02", 38, 38, "stat", ["earth-01"]),
        node("earth-03", 62, 38, "stat", ["earth-01"]),
        node("earth-04", 32, 57, "passive", ["earth-01"]),
        node("earth-05", 68, 57, "passive", ["earth-01"]),
        node("earth-06", 50, 70, "art", ["earth-04", "earth-05"], true),
        node("earth-07", 27, 27, "support", ["earth-02"], true),
        node("earth-08", 73, 27, "support", ["earth-03"], true),
        node("earth-09", 18, 54, "art", ["earth-04", "earth-07"], true),
        node("earth-10", 82, 54, "art", ["earth-05", "earth-08"], true),
        node("earth-11", 35, 82, "stat", ["earth-06"]),
        node("earth-12", 65, 82, "stat", ["earth-06"]),
      ],
    },

    air: {
      element: "air",
      nodes: [
        node("air-01", 50, 50, "art", []),
        node("air-02", 40, 39, "support", ["air-01"], true),
        node("air-03", 61, 36, "stat", ["air-01"]),
        node("air-04", 68, 51, "art", ["air-03"], true),
        node("air-05", 58, 64, "passive", ["air-04"]),
        node("air-06", 41, 65, "art", ["air-01"], true),
        node("air-07", 30, 54, "stat", ["air-06"]),
        node("air-08", 25, 35, "support", ["air-02", "air-07"], true),
        node("air-09", 48, 21, "art", ["air-02", "air-03"], true),
        node("air-10", 77, 34, "passive", ["air-03"]),
        node("air-11", 77, 68, "art", ["air-04", "air-05"], true),
        node("air-12", 45, 83, "support", ["air-05", "air-06"], true),
      ],
    },

    ice: {
      element: "ice",
      nodes: [
        node("ice-01", 50, 50, "art", []),
        node("ice-02", 38, 38, "stat", ["ice-01"]),
        node("ice-03", 62, 38, "support", ["ice-01"], true),
        node("ice-04", 31, 56, "passive", ["ice-02"]),
        node("ice-05", 69, 56, "art", ["ice-03"], true),
        node("ice-06", 50, 69, "stat", ["ice-01"]),
        node("ice-07", 22, 33, "art", ["ice-02"], true),
        node("ice-08", 50, 20, "support", ["ice-02", "ice-03"], true),
        node("ice-09", 78, 33, "art", ["ice-03"], true),
        node("ice-10", 20, 70, "stat", ["ice-04"]),
        node("ice-11", 80, 70, "passive", ["ice-05"]),
        node("ice-12", 50, 85, "art", ["ice-06"], true),
      ],
    },

    storm: {
      element: "storm",
      nodes: [
        node("storm-01", 50, 50, "art", []),
        node("storm-02", 38, 39, "stat", ["storm-01"]),
        node("storm-03", 63, 37, "art", ["storm-01"], true),
        node("storm-04", 70, 52, "support", ["storm-03"], true),
        node("storm-05", 59, 66, "passive", ["storm-04"]),
        node("storm-06", 40, 66, "art", ["storm-01"], true),
        node("storm-07", 29, 54, "support", ["storm-02", "storm-06"], true),
        node("storm-08", 24, 30, "art", ["storm-02"], true),
        node("storm-09", 51, 19, "stat", ["storm-02", "storm-03"]),
        node("storm-10", 79, 31, "art", ["storm-03"], true),
        node("storm-11", 81, 70, "support", ["storm-04", "storm-05"], true),
        node("storm-12", 46, 84, "art", ["storm-05", "storm-06"], true),
      ],
    },

    light: {
      element: "light",
      nodes: [
        node("light-01", 50, 50, "art", []),
        node("light-02", 50, 34, "support", ["light-01"], true),
        node("light-03", 65, 42, "stat", ["light-01"]),
        node("light-04", 67, 59, "art", ["light-03"], true),
        node("light-05", 50, 68, "passive", ["light-01"]),
        node("light-06", 33, 59, "art", ["light-01"], true),
        node("light-07", 35, 42, "stat", ["light-01"]),
        node("light-08", 50, 18, "art", ["light-02"], true),
        node("light-09", 80, 34, "support", ["light-03"], true),
        node("light-10", 78, 72, "art", ["light-04", "light-05"], true),
        node("light-11", 22, 72, "art", ["light-05", "light-06"], true),
        node("light-12", 20, 34, "support", ["light-07"], true),
      ],
    },

    shadow: {
      element: "shadow",
      nodes: [
        node("shadow-01", 50, 50, "art", []),
        node("shadow-02", 41, 37, "passive", ["shadow-01"]),
        node("shadow-03", 62, 39, "art", ["shadow-01"], true),
        node("shadow-04", 67, 56, "support", ["shadow-03"], true),
        node("shadow-05", 53, 68, "art", ["shadow-04"], true),
        node("shadow-06", 36, 63, "stat", ["shadow-01"]),
        node("shadow-07", 27, 48, "support", ["shadow-02", "shadow-06"], true),
        node("shadow-08", 25, 27, "art", ["shadow-02"], true),
        node("shadow-09", 57, 20, "stat", ["shadow-02", "shadow-03"]),
        node("shadow-10", 78, 31, "passive", ["shadow-03"]),
        node("shadow-11", 80, 68, "art", ["shadow-04", "shadow-05"], true),
        node("shadow-12", 43, 84, "art", ["shadow-05", "shadow-06"], true),
      ],
    },

    voidborne: {
      element: "voidborne",
      nodes: [
        node("voidborne-01", 50, 50, "art", []),
        node("voidborne-02", 39, 40, "passive", ["voidborne-01"]),
        node("voidborne-03", 63, 38, "support", ["voidborne-01"], true),
        node("voidborne-04", 69, 54, "stat", ["voidborne-03"]),
        node(
          "voidborne-05",
          56,
          66,
          "art",
          ["voidborne-01", "voidborne-04"],
          true,
        ),
        node("voidborne-06", 36, 64, "support", ["voidborne-01"], true),
        node("voidborne-07", 25, 51, "stat", ["voidborne-02", "voidborne-06"]),
        node("voidborne-08", 29, 27, "art", ["voidborne-02"], true),
        node("voidborne-09", 57, 20, "passive", [
          "voidborne-02",
          "voidborne-03",
        ]),
        node(
          "voidborne-10",
          80,
          29,
          "art",
          ["voidborne-03", "voidborne-04"],
          true,
        ),
        node(
          "voidborne-11",
          78,
          72,
          "support",
          ["voidborne-04", "voidborne-05"],
          true,
        ),
        node(
          "voidborne-12",
          41,
          84,
          "art",
          ["voidborne-05", "voidborne-06"],
          true,
        ),
      ],
    },
  };

export function getRelicArtTree(element: RelicArtElement) {
  return RELIC_ART_TREES[element];
}
