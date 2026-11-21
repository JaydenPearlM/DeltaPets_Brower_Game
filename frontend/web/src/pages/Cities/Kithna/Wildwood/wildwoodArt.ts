import type { DeltaPhase } from "@/lib/timers/useDeltaTime";

// Scenery aliases are presentation-only; they never create or advance rooms.
export const WILDWOOD_LOCATIONS = {
  entrance: "entrance",
  brush: "forest_path",
  creek: "creek_crossing",
  clearing: "flower_glade",
  ancient: "shadow_hollow",
  corrupted: "corrupted_land",
} as const;

export type WildwoodSceneId = keyof typeof WILDWOOD_LOCATIONS;
export type WildwoodArtPhase = DeltaPhase;
export type WildwoodArtLibrary = Record<WildwoodSceneId, Partial<Record<WildwoodArtPhase, string>>>;

export const WILDWOOD_ART_PHASES: readonly WildwoodArtPhase[] = [
  "dawn", "day", "dusk", "twilight", "night", "deep_night",
];

// Vite includes only files that actually exist. No generated/broken URL entries.
const files = import.meta.glob<string>(["/src/kith/assets/wildwood/*.png", "/src/kith/assets/wildwood/wildwood_assets/wildwood_entrance_*.png"], {
  eager: true, query: "?url", import: "default",
});

export const wildwoodArt: WildwoodArtLibrary = {
  entrance: {}, brush: {}, creek: {}, clearing: {}, ancient: {}, corrupted: {},
};
for (const scene of Object.keys(WILDWOOD_LOCATIONS) as WildwoodSceneId[]) {
  for (const phase of WILDWOOD_ART_PHASES) {
    const url = files[`/src/kith/assets/wildwood/wildwood_${WILDWOOD_LOCATIONS[scene]}_${phase}.png`];
    if (url) wildwoodArt[scene][phase] = url;
  }
}

for (const phase of WILDWOOD_ART_PHASES) {
  const filename = phase === "twilight" ? "late_night" : phase;
  const url = files[`/src/kith/assets/wildwood/wildwood_assets/wildwood_entrance_${filename}.png`];
  if (url) wildwoodArt.entrance[phase] = url;
}

export function selectWildwoodArt(scene: WildwoodSceneId, phase: DeltaPhase, library = wildwoodArt): string | null {
  // Keep the existing dusk fallback for scenery without a dedicated dusk image.
  const artPhase = phase === "dusk" ? "twilight" : phase;
  return library[scene][phase] ?? library[scene][artPhase] ?? library[scene].day ?? null;
}
