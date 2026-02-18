// src/pages/PetHome_SecretHaven/secretHaven.types.ts

export type CooldownState = {
  ends_at: string | null;
  remaining_ms: number;
  ready: boolean;
};

export type Cooldowns = {
  feed: CooldownState;
  clean: CooldownState;
  play: CooldownState;
  bond: CooldownState;
};

export type ActivePetResponse = {
  server_now: string;
  pet: any | null;
  cooldowns?: Cooldowns | null;
};

export type RoomKey = "care" | "bond";

export type FurnitureKind =
  | "trough"
  | "wash"
  | "bed"
  | "couch"
  | "table"
  | "chair"
  | "rug";

export type FurnitureDef = {
  kind: FurnitureKind;
  label: string;
  w: number; // tiles
  h: number; // tiles
  tilesCost: number; // placement budget
  description: string;
  buffs: Record<string, number>; // future use
};

export type PlacedFurniture = {
  id: string;
  kind: FurnitureKind;
  x: number; // tile coords
  y: number;
  rot: 0 | 90;
};

export type RoomLayout = {
  roomKey: RoomKey;
  width: number;
  height: number;
  maxTilesBudget: number;
  items: PlacedFurniture[];
};
