import { supabaseAdmin } from "../lib/supabaseAdmin";

export type PersonalityRow = {
  id: string;
  key: string;
};

export async function getAllPersonalities(): Promise<PersonalityRow[]> {
  const { data, error } = await supabaseAdmin
    .from("personalities")
    .select("id, key")
    .order("key", { ascending: true });

  if (error) throw new Error(`Failed to load personalities: ${error.message}`);
  if (!data || data.length === 0) throw new Error("No personalities found");

  return data;
}

export async function rollPersonality(): Promise<PersonalityRow> {
  const all = await getAllPersonalities();
  return all[Math.floor(Math.random() * all.length)];
}
