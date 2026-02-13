import { supabaseAdmin } from "../lib/supabaseAdmin";

type Points = {
  hp: number;
  atk: number;
  magi: number;
  def: number;
  spd: number;
};

function addPoints(a: Points, b: Points): Points {
  return {
    hp: a.hp + b.hp,
    atk: a.atk + b.atk,
    magi: a.magi + b.magi,
    def: a.def + b.def,
    spd: a.spd + b.spd,
  };
}

function deriveFromPoints(p: Points) {
  // ✅ Your rule
  const hp_max = p.hp * 2;

  return {
    hp_max,
    atk: p.atk,
    magi: p.magi,
    def: p.def,
    spd: p.spd,
  };
}

export async function syncPetDerivedStats(
  petId: string,
  opts?: { refillHp?: boolean },
) {
  // 1) base points
  const baseRes = await supabaseAdmin
    .from("pet_stats")
    .select("base_hp, base_atk, base_magi, base_def, base_spd")
    .eq("pet_id", petId)
    .single();

  if (baseRes.error) throw baseRes.error;

  const base: Points = {
    hp: baseRes.data.base_hp ?? 0,
    atk: baseRes.data.base_atk ?? 0,
    magi: baseRes.data.base_magi ?? 0,
    def: baseRes.data.base_def ?? 0,
    spd: baseRes.data.base_spd ?? 0,
  };

  // 2) allocation points
  const allocRes = await supabaseAdmin
    .from("pet_stat_allocations")
    .select("hp, atk, magi, def, spd")
    .eq("pet_id", petId);

  if (allocRes.error) throw allocRes.error;

  const allocTotal: Points = (allocRes.data ?? []).reduce(
    (acc, row) =>
      addPoints(acc, {
        hp: row.hp ?? 0,
        atk: row.atk ?? 0,
        magi: row.magi ?? 0,
        def: row.def ?? 0,
        spd: row.spd ?? 0,
      }),
    { hp: 0, atk: 0, magi: 0, def: 0, spd: 0 },
  );

  const total = addPoints(base, allocTotal);
  const derived = deriveFromPoints(total);

  // 3) sync pets snapshot
  const petRes = await supabaseAdmin
    .from("pets")
    .select("hp_cur")
    .eq("id", petId)
    .single();

  if (petRes.error) throw petRes.error;

  const currentHp = petRes.data.hp_cur ?? derived.hp_max;
  const newHpCur = opts?.refillHp
    ? derived.hp_max
    : Math.min(currentHp, derived.hp_max);

  const upd = await supabaseAdmin
    .from("pets")
    .update({
      hp_max: derived.hp_max,
      hp_cur: newHpCur,
      atk: derived.atk,
      magi: derived.magi,
      def: derived.def,
      spd: derived.spd,
    })
    .eq("id", petId);

  if (upd.error) throw upd.error;

  return { base, allocTotal, total, derived };
}
