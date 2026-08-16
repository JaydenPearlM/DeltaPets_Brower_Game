import { supabaseAdmin } from "../lib/supabaseAdmin";
import { logger } from "../lib/logger";

export type PersonalityRow = {
  id: string;
  key: string;
};

export async function getAllPersonalities(): Promise<PersonalityRow[]> {
  const { data, error } = await supabaseAdmin
    .from("personalities")
    .select("id, key")
    .order("key", { ascending: true });

  if (error) {
    logger.error("[personalities] failed to load personalities", {
      error: error.message,
    });
    return [];
  }

  return data ?? [];
}

export async function rollPersonality(): Promise<PersonalityRow | null> {
  const all = await getAllPersonalities();
  if (all.length === 0) return null;
  return all[Math.floor(Math.random() * all.length)];
}
