import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const rules = {
  clothing: { file: "basic_clothing", min: 5, max: 12 },
  accessories: { file: "hats_and_glasses", min: 3, max: 8 },
  relics: { file: "basic_relics", min: 2, max: 6 },
  petCare: { file: "basic_pet_care", min: 8, max: 20 },
} as const;
export type KennithCategory = keyof typeof rules;
export type KennithStock = { slug: string; category: KennithCategory; price: number; stock: number };

export function kennithTradeCatalog(): Omit<KennithStock, "stock">[] {
  return (Object.keys(rules) as KennithCategory[]).flatMap(category => {
    const catalog: Array<{ slug: string; price: number }> = JSON.parse(readFileSync(
      resolve(__dirname, `../../../../frontend/pet_items/tutorial/${rules[category].file}.json`), "utf8"));
    if (catalog.some(item => !item.slug || !Number.isSafeInteger(item.price) || item.price <= 0))
      throw new Error("Invalid Kennith catalog");
    return catalog.map(({ slug, price }) => ({ slug, price, category }));
  });
}

// JSON remains the catalog authority. Both src/lib and dist/lib resolve here.
export function kennithDailyStock(day: number): KennithStock[] {
  if (!Number.isSafeInteger(day) || day < 0) throw new Error("Invalid merchant day");
  const hash = (value: string) => {
    let result = 2166136261;
    for (const char of value) result = Math.imul(result ^ char.charCodeAt(0), 16777619);
    return result >>> 0;
  };
  return (Object.keys(rules) as KennithCategory[]).flatMap(category => {
    const rule = rules[category];
    const catalog: Array<{ slug: string; price: number }> = JSON.parse(readFileSync(
      resolve(__dirname, `../../../../frontend/pet_items/tutorial/${rule.file}.json`), "utf8"));
    const slugs = catalog.map(item => item.slug);
    if (catalog.some(item => !Number.isSafeInteger(item.price) || item.price <= 0))
      throw new Error("Invalid Kennith price");
    if (slugs.length < 5 || new Set(slugs).size !== slugs.length || slugs.some(slug => !slug))
      throw new Error("Invalid Kennith catalog");
    return slugs.sort((a, b) => hash(`${day}:${category}:${a}`) - hash(`${day}:${category}:${b}`) || a.localeCompare(b))
      .slice(0, 5).map(slug => ({ slug, category, price: catalog.find(item => item.slug === slug)!.price,
        stock: rule.min + hash(`${day}:${category}:stock:${slug}`) % (rule.max - rule.min + 1) }));
  });
}
