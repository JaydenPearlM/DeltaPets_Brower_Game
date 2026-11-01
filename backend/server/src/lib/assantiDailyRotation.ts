/**
 * Assanti's daily merchant rotation.
 *
 * - 5 random foods
 * - 5 random potions
 * - 5–20 starting stock per item
 * - Same results throughout one Aliune day
 * - New results when the Aliune day changes
 *
 * This module generates the rotation.
 * Database persistence is handled separately.
 */

export type ShopCategory = "food" | "potion";

export interface CatalogItem {
  slug: string;
  price: number;
  [key: string]: unknown;
}

export interface DailyStockItem {
  slug: string;
  startingStock: number;
}

export interface DailyRotation {
  deltaDay: number;
  foods: DailyStockItem[];
  potions: DailyStockItem[];
}

/**
 * Stable 32-bit hash.
 * Identical inputs always produce identical results.
 */
function hash(value: string): number {
  let h = 2166136261;

  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }

  return h >>> 0;
}

/**
 * Select exactly five items for one category.
 */
function selectFive(
  items: readonly CatalogItem[],
  day: number,
  category: ShopCategory,
): DailyStockItem[] {
  if (new Set(items.map((item) => item.slug)).size !== items.length) {
    throw new Error(`Duplicate ${category} slugs`);
  }

  if (items.length < 5) {
    throw new Error(`Need at least five ${category} items`);
  }

  return [...items]
    .sort(
      (a, b) =>
        hash(`${day}:${category}:pick:${a.slug}`) -
          hash(`${day}:${category}:pick:${b.slug}`) ||
        a.slug.localeCompare(b.slug),
    )
    .slice(0, 5)
    .map((item) => ({
      slug: item.slug,
      startingStock: 5 + (hash(`${day}:${category}:stock:${item.slug}`) % 16),
    }));
}

/**
 * Generate the daily rotation using both JSON catalogs.
 */
export function makeAssantiDailyRotation(
  deltaDay: number,
  foods: readonly CatalogItem[],
  potions: readonly CatalogItem[],
): DailyRotation {
  if (!Number.isSafeInteger(deltaDay) || deltaDay < 0) {
    throw new Error("Invalid Aliune day");
  }

  return {
    deltaDay,
    foods: selectFive(foods, deltaDay, "food"),
    potions: selectFive(potions, deltaDay, "potion"),
  };
}
