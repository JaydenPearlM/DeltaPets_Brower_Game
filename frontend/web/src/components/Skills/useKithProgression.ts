import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api/baseClient";
import { useAuth } from "@/app/providers/useAuth";
import type { BattleAction } from "@shared/battle/wildwoodTypes";

export type LearnedBattleSkill = {
  id: string;
  slug: Extract<BattleAction, { action: "skill" }>["skillId"];
  name: string; description: string | null; manaCost: number;
  role: string; target: "self" | "living_ally" | "enemy";
};
export type ProgressionState = {
  pet: { id: string; level: number; xp: number; unspent_points: number };
  choices: { slug: string; name: string; description: string; role: string; manaCost: number | null; combatEnabled: boolean }[];
  combatSkills: LearnedBattleSkill[];
  learned: { skill_id: string; definition: { name: string } | null }[];
  nextMilestone: number | null;
  skillStatus: "available" | "ineligible" | "reconciliation_required" | "definitions_unavailable";
  pendingReplacement: { skill_id: string; milestone_key: string } | null;
  equippedSlots: { slot: number; skill: { skill_id: string; definition: { name: string } | null } | null }[];
  availablePoints: number; earnedPoints: number; allocatedPoints: number;
  allocationStatus: "ineligible" | "available" | "reconciliation_required";
};
export function useKithProgression(petId: string | undefined, enabled = true) {
  const { user } = useAuth();
  const [result, setResult] = useState<{ key: string; state: ProgressionState } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const key = `${user?.id ?? ""}:${petId ?? ""}`;
  const [revision, setRevision] = useState(0);
  const reload = useCallback(() => setRevision(value => value + 1), []);
  useEffect(() => {
    let cancelled = false;
    setResult(null); setError(null);
    if (!enabled || !user || !petId) { setLoading(false); return; }
    setLoading(true);
    apiFetch<ProgressionState>(`/api/pets/progression/${petId}/state`)
      .then(state => { if (!cancelled) setResult({ key, state }); })
      .catch(e => { if (!cancelled) setError(e instanceof Error ? e.message : "Progression could not be loaded."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [key, petId, user?.id, enabled, revision]);
  return { state: result?.key === key ? result.state : null, error, loading, reload };
}
