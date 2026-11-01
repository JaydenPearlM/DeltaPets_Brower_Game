import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (name: string) => JSON.parse(readFileSync(resolve(__dirname, `../../../../frontend/pet_items/${name}.json`), "utf8"));
export function getBasicRelics(): { slug: string; name: string }[] {
  return read("tutorial/basic_relics");
}
export function getTutorialCare(): { slug: string; name: string; effects: Record<string, number> }[] {
  const slugs = new Set((read("tutorial/basic_pet_care") as { slug: string }[]).map(item => item.slug));
  return read("care_items").filter((item: { slug: string }) => slugs.has(item.slug));
}
