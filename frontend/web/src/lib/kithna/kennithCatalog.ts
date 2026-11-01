import clothing from "../../../../pet_items/tutorial/basic_clothing.json";
import accessories from "../../../../pet_items/tutorial/hats_and_glasses.json";
import relics from "../../../../pet_items/tutorial/basic_relics.json";
import careCatalog from "../../../../pet_items/tutorial/basic_pet_care.json";
import careDefinitions from "../../../../pet_items/care_items.json";

export type KennithCategory = "clothing" | "accessories" | "relics" | "petCare";
export type KennithPreview = {
  slug: string;
  price: number;
  name: string;
  description: string;
};
const preview = (item: {
  slug: string;
  price: number;
  name: string;
  artwork_description: string;
}): KennithPreview => ({
  slug: item.slug,
  price: item.price,
  name: item.name,
  description: item.artwork_description,
});

// JSON supplies display metadata and approved prices; server owns stock and trades.
export const kennithCatalog: Record<KennithCategory, KennithPreview[]> = {
  clothing: clothing.map(preview),
  accessories: accessories.map(preview),
  relics: relics.map(preview),
  petCare: careCatalog.map(({ slug, price }) => {
    const item = careDefinitions.find((definition) => definition.slug === slug);
    if (!item) throw new Error(`Unknown Kennith care item: ${slug}`);
    return { slug: item.slug, price, name: item.name, description: item.description };
  }),
};

// Stable per-day preview selection; quantities/prices remain server trade concerns.
export function selectKennithItems(
  category: KennithCategory,
  day: number,
): KennithPreview[] {
  if (!Number.isSafeInteger(day) || day < 0)
    throw new Error("Invalid merchant day");
  const hash = (value: string) => {
    let result = 2166136261;
    for (const char of value)
      result = Math.imul(result ^ char.charCodeAt(0), 16777619);
    return result >>> 0;
  };
  return [...kennithCatalog[category]]
    .sort(
      (a, b) =>
        hash(`${day}:${category}:${a.slug}`) -
          hash(`${day}:${category}:${b.slug}`) || a.slug.localeCompare(b.slug),
    )
    .slice(0, 5);
}
