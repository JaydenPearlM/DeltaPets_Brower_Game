// src/pages/PetHome_SecretHaven/secretHaven.data.ts

import type {
  FurnitureDef,
  FurnitureKind,
  RoomKey,
  RoomLayout,
} from "./secretHaven.types";

export const TILE = 48;

export const FURNITURE: Record<FurnitureKind, FurnitureDef> = {
  trough: {
    kind: "trough",
    label: "Trough",
    w: 2,
    h: 1,
    tilesCost: 2,
    description: "Feeds your pet. Later: increases hunger buffer.",
    buffs: { hunger_decay_modifier: -0.1 },
  },
  wash: {
    kind: "wash",
    label: "Wash Station",
    w: 2,
    h: 1,
    tilesCost: 2,
    description: "Cleans your pet. Later: faster cleanliness recovery.",
    buffs: { cleanliness_gain: 1 },
  },
  bed: {
    kind: "bed",
    label: "Pet Bed",
    w: 2,
    h: 2,
    tilesCost: 4,
    description: "Rest spot. Later: passive energy regen.",
    buffs: { energy_regen: 1 },
  },
  couch: {
    kind: "couch",
    label: "Couch",
    w: 2,
    h: 1,
    tilesCost: 2,
    description: "Bonding furniture. Later: bond gain bonus.",
    buffs: { bond_gain: 0.1 },
  },
  table: {
    kind: "table",
    label: "Table",
    w: 2,
    h: 2,
    tilesCost: 4,
    description: "Decor / crafting surface. Later: boosts daily quest rewards.",
    buffs: { daily_bonus: 0.05 },
  },
  chair: {
    kind: "chair",
    label: "Chair",
    w: 1,
    h: 1,
    tilesCost: 1,
    description: "A tiny throne. Later: small bond bonus.",
    buffs: { bond_gain: 0.03 },
  },
  rug: {
    kind: "rug",
    label: "Rug",
    w: 3,
    h: 2,
    tilesCost: 6,
    description: "Cozy vibes. Later: happiness gain.",
    buffs: { happiness_gain: 0.1 },
  },
};

export function roomDefaults(roomKey: RoomKey): RoomLayout {
  // Slightly different vibes per room
  if (roomKey === "care") {
    return {
      roomKey,
      width: 12,
      height: 9,
      maxTilesBudget: 28,
      items: [
        { id: crypto.randomUUID(), kind: "trough", x: 1, y: 6, rot: 0 },
        { id: crypto.randomUUID(), kind: "wash", x: 9, y: 1, rot: 0 },
        { id: crypto.randomUUID(), kind: "bed", x: 2, y: 1, rot: 0 },
      ],
    };
  }

  return {
    roomKey,
    width: 12,
    height: 9,
    maxTilesBudget: 28,
    items: [
      { id: crypto.randomUUID(), kind: "couch", x: 2, y: 6, rot: 0 },
      { id: crypto.randomUUID(), kind: "table", x: 6, y: 5, rot: 0 },
      { id: crypto.randomUUID(), kind: "chair", x: 5, y: 7, rot: 0 },
      { id: crypto.randomUUID(), kind: "chair", x: 9, y: 7, rot: 0 },
      { id: crypto.randomUUID(), kind: "rug", x: 4, y: 2, rot: 0 },
    ],
  };
}
