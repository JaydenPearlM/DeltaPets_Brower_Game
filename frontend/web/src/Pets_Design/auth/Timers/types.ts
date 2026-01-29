export type HatchInfo = {
  ready: boolean;
  hatch_ends_at: string | null;
  hatch_remaining_ms: number;
};

export type ActivePetResponse = {
  server_now: string;
  pet: any | null; // replace 'any' with your Pet type if you have one
  hatch: HatchInfo | null;
};
