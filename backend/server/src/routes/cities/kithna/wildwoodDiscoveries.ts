import { randomInt } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { isDeepStrictEqual } from "node:util";
import { z } from "zod";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

// Explicitly approved discovery entries. Region alone never enables a drop.
export const WILDWOOD_DISCOVERY_SLUGS = [
  "brookglass-pendant", "emberheart-charm", "rootbound-cairn", "whisperleaf-talisman",
  "frostfern-brooch", "thunderbough-seal", "dawnpetal-locket", "duskroot-amulet",
  "ripple-might-etching", "ripple-arcana-etching", "ember-might-etching", "ember-arcana-etching",
  "root-might-etching", "root-arcana-etching", "gale-might-etching", "gale-arcana-etching",
  "frost-might-etching", "frost-arcana-etching", "thunder-might-etching", "thunder-arcana-etching",
  "dawn-might-etching", "dawn-arcana-etching", "dusk-might-etching", "dusk-arcana-etching",
] as const;

const definition = z.object({
  slug: z.string().min(1), name: z.string().min(1), description: z.string().min(1),
  type: z.enum(["equipment", "material"]), category: z.enum(["relic", "etching"]),
  region: z.literal("kithna"),
  element: z.enum(["water", "fire", "earth", "air", "ice", "storm", "light", "shadow"]),
  rarity: z.number().int().min(1).max(5), stack_limit: z.number().int().positive(),
  effects: z.record(z.string(), z.unknown()).default({}),
});

export function getWildwoodDiscoveryCatalog() {
  const items = ["relics", "etchings"].flatMap(name => definition.array().parse(
    JSON.parse(readFileSync(resolve(__dirname, `../../../../../../frontend/pet_items/${name}.json`), "utf8")),
  ));
  if (new Set(items.map(item => item.slug)).size !== items.length)
    throw new Error("Duplicate Wildwood discovery definition.");
  return WILDWOOD_DISCOVERY_SLUGS.map(slug => {
    const item = items.find(entry => entry.slug === slug);
    if (!item || (item.category === "relic" ? item.type !== "equipment" : item.type !== "material"))
      throw new Error(`Invalid Wildwood discovery definition: ${slug}`);
    const { region: _region, element: _element, ...persisted } = item;
    return persisted;
  });
}

export const wildwoodDiscoveryEnabled = () => process.env.WILDWOOD_ITEM_COLLECTION_ENABLED === "true";

export async function readyWildwoodDiscoveryCatalog() {
  // Explicit deployment switch AND a versioned, matching database catalog are required.
  if (!wildwoodDiscoveryEnabled()) return null;
  const expected = getWildwoodDiscoveryCatalog();
  const { data, error } = await supabaseAdmin.rpc("wildwood_discovery_readiness");
  if (error || data?.version !== 2 || !isDeepStrictEqual(data.items, expected)) return null;
  return expected;
}

export function selectWildwoodDiscovery<T>(items: readonly T[]): T {
  if (!items.length) throw new Error("Wildwood discovery pool is empty.");
  return items[randomInt(items.length)];
}

export const discoveryClaimSchema = z.object({ roomId: z.uuid() }).strict();
