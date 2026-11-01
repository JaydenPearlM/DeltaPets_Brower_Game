import elementalDeltas from "../../../pet_items/elemental_deltas.json";

const progressionSlugs = new Set(elementalDeltas.map(item => item.slug));

// Display only: never filter inventory APIs, saved quantities or progression.
export function isRegularInventoryItem(item: { slug: string }): boolean {
  return !progressionSlugs.has(item.slug) && !/^haiku[_-]scroll(?:[_-]|$)/i.test(item.slug);
}
