# Wildwood progression implementation review

Branch: `Core_Systems_version_1`. Initial working tree: no staged changes, 20 modified files and 19 untracked paths. Earlier Wildwood changes were present; unrelated user edits were preserved.

## Implemented rules

- A newly created Wildwood 1v1 victory grants 25 XP to its living participant exactly once.
- XP remains lifetime cumulative: level L requires 50 × L × (L − 1) XP. Level 2 starts at 100, level 3 at 300, and level 30 at 43,500.
- Every gained level grants one existing `unspent_points` point. No automatic stat distribution, evolution, or base-stat changes.
- Levels stop at 30; XP continues accumulating. Existing levels and XP are never reset. Multiple level-ups are supported.
- Legacy encounters without `xpRewardVersion: 1` receive no retroactive XP.
- The room receipt and pet update commit together. Existing battle-result recording remains separate and must succeed first. A failed or lost response recovers on reload.
- The existing active-pet XP helper retains its non-battle reward semantics but now increments under a row lock to avoid lost updates.

## Verification

- `pnpm --dir backend/server build`: PASS.
- `pnpm --dir frontend/web build`: PASS.
- `node tools/check-battle-engine.cjs`: PASS, 10 checks.
- `node tools/check-wildwood-integration.cjs`: PASS, including failed XP writes and a lost XP response.
- `node tools/check-wildwood-progression.cjs "C:/Program Files/PostgreSQL/17/bin"`: PASS against isolated PostgreSQL 17 with synthetic fixtures. Verified eight concurrent claims, reconnect, levels 1→2→3, multiple level-ups, level 30, defeated/active/legacy rejection, ownership/role checks, atomic rollback, concurrent egg XP, unrelated-pet and combat-stat preservation.
- Scoped `git diff --check`: PASS.
- No browser interaction, production schema verification, live migration, or live gameplay tests performed. Local SQL tests use a minimal schema matching the relevant repository columns; they do not prove compatibility with unrecorded live schema changes.

## Release dependency

Apply only `20261104134447_wildwood_victory_progression.sql` through the normal reviewed deployment process before releasing this backend. Do not blindly push every local migration: unrelated untracked migrations already exist. No migration was applied to a live database. The frontend and backend reward path depend on these RPCs; until applied, eligible victories report an error and remain recoverable rather than pretending XP succeeded.

## Exact code replacements

The comparisons below are cumulative against Git HEAD and therefore include the already accepted earlier Wildwood edits in these files. Line numbers refer to the current working-tree files. Empty old_code blocks indicate additions. Test and migration additions are included in full.

filename: `A:/Deltapets_vault/01_Current_Project/backend/server/src/battle/battleEngine.ts`
linenumber: 13
description: Allow Wildwood to opt into level 30 while preserving the default level-10 battle cap.
old_code:
```
const participantSchema = z.object({
```
new_code:
```
const participantSchema = (maxLevel: number) => z.object({
```

filename: `A:/Deltapets_vault/01_Current_Project/backend/server/src/battle/battleEngine.ts`
linenumber: 23
description: Allow Wildwood to opt into level 30 while preserving the default level-10 battle cap.
old_code:
```
  level: z.number().int().min(1).max(10),
```
new_code:
```
  level: z.number().int().min(1).max(maxLevel),
```

filename: `A:/Deltapets_vault/01_Current_Project/backend/server/src/battle/battleEngine.ts`
linenumber: 158
description: Allow Wildwood to opt into level 30 while preserving the default level-10 battle cap.
old_code:
```
```
new_code:
```
  maxLevel: 10 | 30 = 10,
```

filename: `A:/Deltapets_vault/01_Current_Project/backend/server/src/battle/battleEngine.ts`
linenumber: 160
description: Allow Wildwood to opt into level 30 while preserving the default level-10 battle cap.
old_code:
```
  const parsed = z.array(participantSchema).min(2).max(8).safeParse(participants);
```
new_code:
```
  requireRule(maxLevel === 10 || maxLevel === 30, "Invalid battle level cap");
  const parsed = z.array(participantSchema(maxLevel)).min(2).max(8).safeParse(participants);
```

filename: `A:/Deltapets_vault/01_Current_Project/backend/server/src/battle/battleEngine.ts`
linenumber: 163
description: Allow Wildwood to opt into level 30 while preserving the default level-10 battle cap.
old_code:
```
  requireRule(parsed.success, "Invalid participants: require bounded HP, level 1–10 and positive SPD");
```
new_code:
```
  requireRule(parsed.success, `Invalid participants: require bounded HP, level 1–${maxLevel} and positive SPD`);
```

filename: `A:/Deltapets_vault/01_Current_Project/backend/server/src/pets/petProgression.ts`
linenumber: 20
description: Use an atomic existing-source XP increment so simultaneous Wildwood rewards cannot be overwritten.
old_code:
```
  const { data: pet, error } = await supabaseAdmin
    .from("pets")
    .select("id, xp")
    .eq("user_id", userId)
    .eq("is_active", true)
    .eq("ran_away", false)
    .maybeSingle();
```
new_code:
```
  // Serialize with Wildwood progression so a stale read cannot overwrite XP.
  const { data, error } = await supabaseAdmin.rpc("increment_active_pet_xp", {
    p_user_id: userId,
    p_amount: safeAmount,
  });
```

filename: `A:/Deltapets_vault/01_Current_Project/backend/server/src/pets/petProgression.ts`
linenumber: 27
description: Use an atomic existing-source XP increment so simultaneous Wildwood rewards cannot be overwritten.
old_code:
```
  if (!pet) return null;

  const previousXp = Number(pet.xp ?? 0);
  const xp = previousXp + safeAmount;

  const { error: updateError } = await supabaseAdmin
    .from("pets")
    .update({ xp })
    .eq("id", pet.id)
    .eq("user_id", userId);

  if (updateError) throw updateError;

  return {
    petId: pet.id,
    previousXp,
    xp,
    amount: safeAmount,
  };
```
new_code:
```
  return data as PetXpAward;
```

filename: `A:/Deltapets_vault/01_Current_Project/backend/server/src/routes/cities/kithna/wildwoodBattleService.ts`
linenumber: 21
description: Keep 1v1 selection and result recording; opt new battles into atomic progression and recover saved reward receipts.
old_code:
```
```
new_code:
```
  WildwoodXpReward,
```

filename: `A:/Deltapets_vault/01_Current_Project/backend/server/src/routes/cities/kithna/wildwoodBattleService.ts`
linenumber: 67
description: Keep 1v1 selection and result recording; opt new battles into atomic progression and recover saved reward receipts.
old_code:
```
```
new_code:
```
  xpRewardVersion?: 1;
  xpReward?: WildwoodXpReward;
```

filename: `A:/Deltapets_vault/01_Current_Project/backend/server/src/routes/cities/kithna/wildwoodBattleService.ts`
linenumber: 109
description: Keep 1v1 selection and result recording; opt new battles into atomic progression and recover saved reward receipts.
old_code:
```
```
new_code:
```
    xpReward: data.xpReward ?? null,
```

filename: `A:/Deltapets_vault/01_Current_Project/backend/server/src/routes/cities/kithna/wildwoodBattleService.ts`
linenumber: 219
description: Keep 1v1 selection and result recording; opt new battles into atomic progression and recover saved reward receipts.
old_code:
```
```
new_code:
```
async function settleXp(userId: string, room: Room | null) {
  if (!room) return;
  const data = payload(room);
  // No retroactive rewards for encounters created before progression shipped.
  if (data.xpRewardVersion !== 1 || data.battle?.status !== "victory") return;
  const result = await supabaseAdmin.rpc("settle_wildwood_victory_xp", {
    p_user_id: userId,
    p_room_id: room.id,
  });
  if (result.error) throw result.error;
  const reward = z.object({
    petId: z.uuid(), amount: z.literal(25),
    previousXp: z.number().int().nonnegative(), xp: z.number().int().nonnegative(),
    previousLevel: z.number().int().min(1).max(30), level: z.number().int().min(1).max(30),
    pointsEarned: z.number().int().min(0).max(29),
  }).safeParse(result.data);
  if (!reward.success) throw new WildwoodError("XP could not be confirmed. Reload to recover your reward.");
  data.xpReward = reward.data;
}

```

filename: `A:/Deltapets_vault/01_Current_Project/backend/server/src/routes/cities/kithna/wildwoodBattleService.ts`
linenumber: 301
description: Keep 1v1 selection and result recording; opt new battles into atomic progression and recover saved reward receipts.
old_code:
```
  level: z.number().int().min(1).max(10),
```
new_code:
```
  level: z.number().int().min(1).max(30),
```

filename: `A:/Deltapets_vault/01_Current_Project/backend/server/src/routes/cities/kithna/wildwoodBattleService.ts`
linenumber: 460
description: Keep 1v1 selection and result recording; opt new battles into atomic progression and recover saved reward receipts.
old_code:
```
```
new_code:
```
  await settleXp(userId, room);
```

filename: `A:/Deltapets_vault/01_Current_Project/backend/server/src/routes/cities/kithna/wildwoodBattleService.ts`
linenumber: 494
description: Keep 1v1 selection and result recording; opt new battles into atomic progression and recover saved reward receipts.
old_code:
```
```
new_code:
```
  await settleXp(userId, previous);
```

filename: `A:/Deltapets_vault/01_Current_Project/backend/server/src/routes/cities/kithna/wildwoodBattleService.ts`
linenumber: 528
description: Keep 1v1 selection and result recording; opt new battles into atomic progression and recover saved reward receipts.
old_code:
```
  const players = team.map(
```
new_code:
```
  const players = team.filter((pet) => pet.hpCur > 0).slice(0, 1).map(
```

filename: `A:/Deltapets_vault/01_Current_Project/backend/server/src/routes/cities/kithna/wildwoodBattleService.ts`
linenumber: 541
description: Keep 1v1 selection and result recording; opt new battles into atomic progression and recover saved reward receipts.
old_code:
```
```
new_code:
```
          30,
```

filename: `A:/Deltapets_vault/01_Current_Project/backend/server/src/routes/cities/kithna/wildwoodBattleService.ts`
linenumber: 553
description: Keep 1v1 selection and result recording; opt new battles into atomic progression and recover saved reward receipts.
old_code:
```
```
new_code:
```
    ...(battle ? { xpRewardVersion: 1 as const } : {}),
```

filename: `A:/Deltapets_vault/01_Current_Project/backend/server/src/routes/cities/kithna/wildwoodBattleService.ts`
linenumber: 557
description: Keep 1v1 selection and result recording; opt new battles into atomic progression and recover saved reward receipts.
old_code:
```
      ? "A corrupted Kith blocks the path."
      : "You follow the woodland path. No corrupted Kith appeared this time.",
```
new_code:
```
      ? "A corrupted Kith emerges from the brush!"
      : "The trees rustle softly around you.",
```

filename: `A:/Deltapets_vault/01_Current_Project/backend/server/src/routes/cities/kithna/wildwoodBattleService.ts`
linenumber: 597
description: Keep 1v1 selection and result recording; opt new battles into atomic progression and recover saved reward receipts.
old_code:
```
```
new_code:
```
  await settleXp(userId, inserted.data);
```

filename: `A:/Deltapets_vault/01_Current_Project/backend/server/src/routes/cities/kithna/wildwoodBattleService.ts`
linenumber: 642
description: Keep 1v1 selection and result recording; opt new battles into atomic progression and recover saved reward receipts.
old_code:
```
```
new_code:
```
  await settleXp(userId, updated.data);
```

filename: `A:/Deltapets_vault/01_Current_Project/backend/server/src/shared/battle/wildwoodTypes.ts`
linenumber: 9
description: Expose the server-confirmed progression receipt in Wildwood responses.
old_code:
```
```
new_code:
```
export type WildwoodXpReward = {
  petId: string;
  amount: number;
  previousXp: number;
  xp: number;
  previousLevel: number;
  level: number;
  pointsEarned: number;
};
```

filename: `A:/Deltapets_vault/01_Current_Project/backend/server/src/shared/battle/wildwoodTypes.ts`
linenumber: 33
description: Expose the server-confirmed progression receipt in Wildwood responses.
old_code:
```
```
new_code:
```
  xpReward?: WildwoodXpReward | null;
```

filename: `A:/Deltapets_vault/01_Current_Project/frontend/web/src/pages/Cities/Kithna/Wildwood/WildwoodBattle.tsx`
linenumber: 2
description: Display earned XP, level changes and allocation points using the existing result panel.
old_code:
```
import type { BattleAction, BattleState } from "@shared/battle/wildwoodTypes";
```
new_code:
```
import type { BattleAction, BattleState, WildwoodXpReward } from "@shared/battle/wildwoodTypes";
```

filename: `A:/Deltapets_vault/01_Current_Project/frontend/web/src/pages/Cities/Kithna/Wildwood/WildwoodBattle.tsx`
linenumber: 26
description: Display earned XP, level changes and allocation points using the existing result panel.
old_code:
```
```
new_code:
```
  xpReward?: WildwoodXpReward | null;
```

filename: `A:/Deltapets_vault/01_Current_Project/frontend/web/src/pages/Cities/Kithna/Wildwood/WildwoodBattle.tsx`
linenumber: 69
description: Display earned XP, level changes and allocation points using the existing result panel.
old_code:
```
```
new_code:
```
  xpReward,
```

filename: `A:/Deltapets_vault/01_Current_Project/frontend/web/src/pages/Cities/Kithna/Wildwood/WildwoodBattle.tsx`
linenumber: 149
description: Display earned XP, level changes and allocation points using the existing result panel.
old_code:
```
              ? ""
```
new_code:
```
              ? "The woodland path grows quiet."
```

filename: `A:/Deltapets_vault/01_Current_Project/frontend/web/src/pages/Cities/Kithna/Wildwood/WildwoodBattle.tsx`
linenumber: 295
description: Display earned XP, level changes and allocation points using the existing result panel.
old_code:
```
          <p>XP and corrupted-egg rewards are not enabled in this version.</p>
```
new_code:
```
          {xpReward ? (
            <p role="status">
              {label(xpReward.petId)} earned {xpReward.amount} XP. {xpReward.level > xpReward.previousLevel
                ? `Level up! Level ${xpReward.previousLevel} → ${xpReward.level}. ${xpReward.pointsEarned} stat point${xpReward.pointsEarned === 1 ? "" : "s"} earned.`
                : `Level ${xpReward.level}${xpReward.level === 30 ? " (maximum)" : ""}.`}
            </p>
          ) : (
            <p>{battle.status === "defeat" ? "No victory XP earned." : "No XP reward confirmed for this encounter."}</p>
          )}
          <p>Corrupted-egg rewards are not enabled in this version.</p>
```

filename: `A:/Deltapets_vault/01_Current_Project/frontend/web/src/pages/Cities/Kithna/Wildwood/WildwoodPage.tsx`
linenumber: 57
description: Pass the saved receipt to battle results and show it after initial reconnect.
old_code:
```
```
new_code:
```
        (!session && Boolean(next.room?.xpReward)) ||
```

filename: `A:/Deltapets_vault/01_Current_Project/frontend/web/src/pages/Cities/Kithna/Wildwood/WildwoodPage.tsx`
linenumber: 343
description: Pass the saved receipt to battle results and show it after initial reconnect.
old_code:
```
```
new_code:
```
          xpReward={room.xpReward}
```

filename: `A:/Deltapets_vault/01_Current_Project/frontend/web/src/pages/Cities/Kithna/Wildwood/WildwoodPage.tsx`
linenumber: 457
description: Pass the saved receipt to battle results and show it after initial reconnect.
old_code:
```
                  Rows set your position. They do not change stats in this
                  version.
```
new_code:
```
                  Your first living party member fights alone. Rows set your
                  position without changing stats.
```

filename: `A:/Deltapets_vault/01_Current_Project/tools/check-battle-engine.cjs`
linenumber: 168
description: Verify level-30 opt-in boundaries and preserved defaults.
old_code:
```
```
new_code:
```
check("Wildwood opt-in accepts levels through 30 without changing the default cap", () => {
  for (const level of [1, 2, 10, 11, 29, 30]) {
    const inputs = [pet("p", "player", { level }), pet("e", "enemy")];
    const state = createBattle("wildwood", inputs, 1, 30);
    assert.equal(state.participants[0].level, level);
    const resumed = act(JSON.parse(JSON.stringify(state)), "skill", "e", "basic-strike");
    assert.equal(resumed.participants[0].level, level);
    if (level > 10) assert.throws(() => createBattle("default", inputs), BattleRuleError);
  }
  for (const level of [0, 31, 1.5, NaN]) {
    assert.throws(() => createBattle("invalid", [pet("p", "player", { level }), pet("e", "enemy")], 1, 30), BattleRuleError);
  }
  assert.throws(() => createBattle("invalid-cap", [pet("p", "player"), pet("e", "enemy")], 1, 100), /Invalid battle level cap/);
});

```

filename: `A:/Deltapets_vault/01_Current_Project/tools/check-wildwood-integration.cjs`
linenumber: 23
description: Verify service XP settlement, retries, lost responses, quest progress and recorded results; remove stale level-5 test expectation.
old_code:
```
```
new_code:
```
let failXpWrite = false;
let loseXpResponse = false;
```

filename: `A:/Deltapets_vault/01_Current_Project/tools/check-wildwood-integration.cjs`
linenumber: 79
description: Verify service XP settlement, retries, lost responses, quest progress and recorded results; remove stale level-5 test expectation.
old_code:
```
  if (request.endsWith("lib/supabaseAdmin")) return { supabaseAdmin: { from: table => new Query(table) } };
```
new_code:
```
  if (request.endsWith("lib/supabaseAdmin")) return { supabaseAdmin: {
    from: table => new Query(table),
    // PostgreSQL concurrency/rollback are covered by check-wildwood-progression.cjs.
    // This double checks service routing, recovery and the response contract.
    async rpc(name, { p_user_id, p_room_id }) {
      assert.equal(name, 'settle_wildwood_victory_xp');
      const room = tables.wildwood_rooms.find(row => row.id === p_room_id);
      const data = room.event_payload;
      assert.equal(data.battle.status, 'victory');
      assert.equal(data.xpRewardVersion, 1);
      if (failXpWrite) { failXpWrite = false; return { data: null, error: Error('Injected XP failure') }; }
      if (data.xpReward) return { data: structuredClone(data.xpReward), error: null };
      const participant = data.battle.participants.find(p => p.side === 'player');
      const pet = tables.pets.find(p => p.id === participant.sourcePetId && p.user_id === p_user_id);
      const previousXp = pet.xp ?? 0, previousLevel = pet.level;
      pet.xp = previousXp + 25;
      while (pet.level < 30 && pet.xp >= 50 * pet.level * (pet.level + 1)) pet.level++;
      const pointsEarned = pet.level - previousLevel;
      pet.unspent_points = (pet.unspent_points ?? 0) + pointsEarned;
      data.xpReward = { petId: pet.id, amount: 25, previousXp, xp: pet.xp, previousLevel, level: pet.level, pointsEarned };
      if (loseXpResponse) { loseXpResponse = false; return { data: null, error: Error('Lost XP response') }; }
      return { data: structuredClone(data.xpReward), error: null };
    },
  } };
```

filename: `A:/Deltapets_vault/01_Current_Project/tools/check-wildwood-integration.cjs`
linenumber: 128
description: Verify service XP settlement, retries, lost responses, quest progress and recorded results; remove stale level-5 test expectation.
old_code:
```
  tables.trainer_progression[0].trainer_level = 1;
  await assert.rejects(service.exploreWildwood(user, requestFor(null)), /Trainer Level 5 is required/);
  assert.equal(tables.wildwood_expeditions.length, 0);
  tables.trainer_progression[0].trainer_level = 5;
```
new_code:
```
```

filename: `A:/Deltapets_vault/01_Current_Project/tools/check-wildwood-integration.cjs`
linenumber: 159
description: Verify service XP settlement, retries, lost responses, quest progress and recorded results; remove stale level-5 test expectation.
old_code:
```
```
new_code:
```
    } else if (win === 4) {
      failXpWrite = true;
      await assert.rejects(service.actInWildwood(user, room.battle.id, action), /Injected XP failure/);
      assert.equal(tables.pets[0].xp, 75);
    } else if (win === 5) {
      loseXpResponse = true;
      await assert.rejects(service.actInWildwood(user, room.battle.id, action), /Lost XP response/);
      assert.equal(tables.pets[0].xp, 125);
```

filename: `A:/Deltapets_vault/01_Current_Project/tools/check-wildwood-integration.cjs`
linenumber: 170
description: Verify service XP settlement, retries, lost responses, quest progress and recorded results; remove stale level-5 test expectation.
old_code:
```
```
new_code:
```
    assert.equal(recovered.room.xpReward.petId, petId);
    assert.equal(recovered.room.xpReward.amount, 25);
    assert.equal(tables.pets[0].xp, win * 25);
```

filename: `A:/Deltapets_vault/01_Current_Project/tools/check-wildwood-integration.cjs`
linenumber: 182
description: Verify service XP settlement, retries, lost responses, quest progress and recorded results; remove stale level-5 test expectation.
old_code:
```
  assert.deepEqual(tables.pets, petBefore);
```
new_code:
```
  assert.deepEqual(tables.pets, [{ ...petBefore[0], xp: 125, level: 2, unspent_points: 1 }]);
```

filename: `A:/Deltapets_vault/01_Current_Project/tools/check-wildwood-integration.cjs`
linenumber: 233
description: Verify service XP settlement, retries, lost responses, quest progress and recorded results; remove stale level-5 test expectation.
old_code:
```
  console.log("PASS: pet records unchanged; no XP or egg writes; no live database used");
```
new_code:
```
  console.log("PASS: participating pet earns 25 XP once per victory, reaches level 2, and preserves other fields; no live database used");
```

filename: `A:/Deltapets_vault/01_Current_Project/supabase/migrations/20261104134447_wildwood_victory_progression.sql`
linenumber: 1
description: Add server-only atomic XP functions and level-30 storage constraints; preserve existing unspent_points and lifetime XP.
old_code:
```
```
new_code:
```
BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TABLE public.pets DROP CONSTRAINT pets_level_check;
ALTER TABLE public.pets ADD CONSTRAINT pets_level_check CHECK (level BETWEEN 0 AND 30);
ALTER TABLE public.pet_stat_allocations DROP CONSTRAINT pet_stat_allocations_level_check;
ALTER TABLE public.pet_stat_allocations ADD CONSTRAINT pet_stat_allocations_level_check CHECK (level BETWEEN 1 AND 30);

-- Only server-created, opted-in 1v1 victories qualify. The room's unique battle_id
-- and locked receipt make retries and concurrent settlement exactly-once.
CREATE FUNCTION public.settle_wildwood_victory_xp(p_user_id uuid, p_room_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_room public.wildwood_rooms%ROWTYPE;
  v_pet public.pets%ROWTYPE;
  v_players jsonb;
  v_pet_id uuid;
  v_level integer;
  v_xp integer;
  v_reward jsonb;
BEGIN
  SELECT room.* INTO v_room
  FROM public.wildwood_rooms room
  JOIN public.wildwood_expeditions expedition ON expedition.id = room.expedition_id
  WHERE room.id = p_room_id AND expedition.user_id = p_user_id
  FOR UPDATE OF room;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Wildwood room not found' USING ERRCODE = '23514';
  END IF;
  IF v_room.status <> 'resolved'
    OR v_room.event_kind <> 'corrupted_battle'
    OR (v_room.event_payload ->> 'xpRewardVersion') IS DISTINCT FROM '1'
    OR (v_room.event_payload ->> 'recordBattleStats') IS DISTINCT FROM 'true'
    OR (v_room.event_payload #>> '{battle,status}') IS DISTINCT FROM 'victory'
    OR (v_room.event_payload #>> '{battle,id}') IS DISTINCT FROM v_room.battle_id::text
  THEN
    RAISE EXCEPTION 'No eligible Wildwood victory' USING ERRCODE = '23514';
  END IF;
  SELECT jsonb_agg(participant) INTO v_players
  FROM jsonb_array_elements(v_room.event_payload #> '{battle,participants}') participant
  WHERE participant ->> 'side' = 'player';
  IF jsonb_array_length(v_players) IS DISTINCT FROM 1
    OR jsonb_array_length(v_room.event_payload #> '{battle,participants}') IS DISTINCT FROM 2
    OR (v_players #>> '{0,defeated}') IS DISTINCT FROM 'false'
    OR COALESCE((v_players #>> '{0,hpCur}')::integer, 0) <= 0
  THEN
    RAISE EXCEPTION 'Expected one living player participant' USING ERRCODE = '23514';
  END IF;
  v_pet_id := COALESCE(v_players #>> '{0,sourcePetId}', v_players #>> '{0,id}')::uuid;
  SELECT * INTO v_pet FROM public.pets
  WHERE id = v_pet_id AND user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Battle participant ownership changed' USING ERRCODE = '23514';
  END IF;
  IF v_room.event_payload ? 'xpReward' THEN
    RETURN v_room.event_payload -> 'xpReward';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.pet_battle_results
    WHERE battle_id = v_room.battle_id AND pet_id = v_pet_id
      AND user_id = p_user_id AND result = 'victory'
  ) THEN
    RAISE EXCEPTION 'Battle result must be recorded before XP' USING ERRCODE = '23514';
  END IF;
  IF v_pet.level NOT BETWEEN 1 AND 30 OR v_pet.xp < 0 THEN
    RAISE EXCEPTION 'Invalid pet progression state' USING ERRCODE = '23514';
  END IF;
  -- Preserve lifetime XP. Reaching level L costs 100 * (1 + ... + L-1).
  -- Existing higher levels are never reduced and existing XP is never reset.
  v_xp := v_pet.xp + 25;
  v_level := v_pet.level;
  WHILE v_level < 30 AND v_xp >= 50 * v_level * (v_level + 1) LOOP
    v_level := v_level + 1;
  END LOOP;
  v_reward := jsonb_build_object(
    'petId', v_pet_id, 'amount', 25, 'previousXp', v_pet.xp, 'xp', v_xp,
    'previousLevel', v_pet.level, 'level', v_level,
    'pointsEarned', v_level - v_pet.level
  );
  UPDATE public.pets SET xp = v_xp, level = v_level,
    unspent_points = unspent_points + (v_level - v_pet.level)
  WHERE id = v_pet_id;
  UPDATE public.wildwood_rooms
  SET event_payload = jsonb_set(event_payload, '{xpReward}', v_reward)
  WHERE id = p_room_id;
  RETURN v_reward;
END;
$$;

REVOKE ALL ON FUNCTION public.settle_wildwood_victory_xp(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.settle_wildwood_victory_xp(uuid, uuid) TO service_role;

-- Keep the existing non-battle reward contract, but avoid stale XP overwrites
-- when egg discovery and Wildwood settlement touch the same pet concurrently.
CREATE FUNCTION public.increment_active_pet_xp(p_user_id uuid, p_amount integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_pet public.pets%ROWTYPE;
BEGIN
  IF p_amount IS NULL OR p_amount < 0 THEN
    RAISE EXCEPTION 'Invalid XP amount' USING ERRCODE = '23514';
  END IF;
  IF p_amount = 0 THEN RETURN NULL; END IF;
  BEGIN
    SELECT * INTO STRICT v_pet FROM public.pets
    WHERE user_id = p_user_id AND is_active = true AND ran_away = false
    FOR UPDATE;
  EXCEPTION WHEN NO_DATA_FOUND THEN RETURN NULL;
  END;
  UPDATE public.pets SET xp = xp + p_amount WHERE id = v_pet.id;
  RETURN jsonb_build_object('petId', v_pet.id, 'previousXp', v_pet.xp,
    'xp', v_pet.xp + p_amount, 'amount', p_amount);
END;
$$;
REVOKE ALL ON FUNCTION public.increment_active_pet_xp(uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_active_pet_xp(uuid, integer) TO service_role;
COMMIT;
```

filename: `A:/Deltapets_vault/01_Current_Project/tools/check-wildwood-progression.cjs`
linenumber: 1
description: Exercise the actual migration in a disposable local PostgreSQL database, including concurrent calls and rollback.
old_code:
```
```
new_code:
```
// Disposable local PostgreSQL only. No production URLs or credentials are used.
// Usage: node tools/check-wildwood-progression.cjs <postgres-bin-directory>
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync, execFile } = require('node:child_process');
const { promisify } = require('node:util');
const run = promisify(execFile);
const bin = process.argv[2];
if (!bin) throw Error('Pass the installed PostgreSQL bin directory');
const exe = name => path.join(bin, name + (process.platform === 'win32' ? '.exe' : ''));
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wildwood-xp-test-'));
const port = '55439';
const args = ['-X', '-h', '127.0.0.1', '-p', port, '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-At'];
const sql = input => execFileSync(exe('psql'), args, { input, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
const user = '11111111-1111-4111-8111-111111111111';
const pet = '22222222-2222-4222-8222-222222222222';
const other = '33333333-3333-4333-8333-333333333333';
let serial = 0;
function room(status = 'victory', version = true) {
  const id = `44444444-4444-4444-8444-${String(++serial).padStart(12, '0')}`;
  const payload = { version: 1, recordBattleStats: true, ...(version ? { xpRewardVersion: 1 } : {}), battle: {
    id, status, participants: [
      { id: pet, sourcePetId: pet, side: 'player', hpCur: status === 'defeat' ? 0 : 10, defeated: status === 'defeat' },
      { id: other, side: 'enemy', hpCur: status === 'victory' ? 0 : 10, defeated: status === 'victory' },
    ],
  } };
  sql(`INSERT INTO wildwood_rooms VALUES ('${id}', '${user}', '${id}', '${status === 'active' ? 'unresolved' : 'resolved'}', 'corrupted_battle', '${JSON.stringify(payload)}');
    INSERT INTO pet_battle_results VALUES ('${id}', '${pet}', '${user}', '${status}');`);
  return id;
}
const claim = id => `SELECT public.settle_wildwood_victory_xp('${user}', '${id}');`;
const state = () => JSON.parse(sql(`SELECT json_build_array(xp, level, unspent_points, hp_cur, atk) FROM pets WHERE id='${pet}'`));
let started = false;
async function main() {
  execFileSync(exe('initdb'), ['-D', dir, '-U', 'postgres', '-A', 'trust', '--no-locale', '--encoding=UTF8'], { stdio: 'pipe', timeout: 60000 });
  started = true;
  // Do not give the detached Windows server inherited pipe handles.
  execFileSync(exe('pg_ctl'), ['-D', dir, '-l', path.join(dir, 'server.log'), '-o', `-h 127.0.0.1 -p ${port}`, '-w', 'start'], { stdio: 'ignore', timeout: 30000 });
  sql(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE TABLE pets (id uuid PRIMARY KEY, user_id uuid, xp integer NOT NULL DEFAULT 0, level integer NOT NULL DEFAULT 1,
      unspent_points integer NOT NULL DEFAULT 0, hp_cur integer DEFAULT 10, atk integer DEFAULT 7,
      is_active boolean DEFAULT false, ran_away boolean DEFAULT false,
      CONSTRAINT pets_level_check CHECK(level BETWEEN 0 AND 10));
    CREATE TABLE pet_stat_allocations (level integer CONSTRAINT pet_stat_allocations_level_check CHECK(level BETWEEN 1 AND 10));
    CREATE TABLE wildwood_expeditions (id uuid PRIMARY KEY, user_id uuid);
    CREATE TABLE wildwood_rooms (id uuid PRIMARY KEY, expedition_id uuid, battle_id uuid UNIQUE, status text, event_kind text, event_payload jsonb);
    CREATE TABLE pet_battle_results (battle_id uuid, pet_id uuid, user_id uuid, result text, PRIMARY KEY(battle_id,pet_id));
    INSERT INTO wildwood_expeditions VALUES ('${user}','${user}');
    INSERT INTO pets(id,user_id) VALUES ('${pet}','${user}'), ('${other}','${user}');
    GRANT SELECT, UPDATE ON pets, wildwood_rooms TO service_role;
    GRANT SELECT ON wildwood_expeditions, pet_battle_results TO service_role;`);
  sql(fs.readFileSync(path.join(__dirname, '../supabase/migrations/20261104134447_wildwood_victory_progression.sql'), 'utf8'));
  const first = room();
  const receipt = JSON.parse(sql(claim(first)));
  assert.equal(receipt.amount, 25);
  assert.deepEqual(state(), [25, 1, 0, 10, 7]);
  assert.deepEqual(JSON.parse(sql(claim(first))), receipt);
  assert.deepEqual(state(), [25, 1, 0, 10, 7]);
  // Each psql call reconnects; the saved receipt survives the client connection.
  const concurrent = room();
  await Promise.all(Array.from({ length: 8 }, () => run(exe('psql'), [...args, '-c', claim(concurrent)])));
  assert.deepEqual(state(), [50, 1, 0, 10, 7]);
  sql(claim(room())); sql(claim(room()));
  assert.deepEqual(state(), [100, 2, 1, 10, 7]);
  for (let i = 0; i < 8; i++) sql(claim(room()));
  assert.deepEqual(state(), [300, 3, 2, 10, 7]);
  for (const id of [room('defeat'), room('active'), room('victory', false)]) assert.throws(() => sql(claim(id)));
  assert.deepEqual(state(), [300, 3, 2, 10, 7]);
  const wrongOwner = room();
  assert.throws(() => sql(`SELECT public.settle_wildwood_victory_xp('${other}','${wrongOwner}');`));
  assert.throws(() => sql(`SET ROLE authenticated; ${claim(wrongOwner)}`));
  sql(`SET ROLE service_role; ${claim(wrongOwner)}`);
  const rollback = room();
  sql(`CREATE FUNCTION fail_receipt() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'injected receipt failure'; END $$;
    CREATE TRIGGER fail_receipt BEFORE UPDATE ON wildwood_rooms FOR EACH ROW EXECUTE FUNCTION fail_receipt();`);
  const before = state();
  assert.throws(() => sql(claim(rollback)));
  assert.deepEqual(state(), before);
  sql('DROP TRIGGER fail_receipt ON wildwood_rooms;');
  sql(claim(rollback));
  sql(`UPDATE pets SET xp=575, level=1, unspent_points=0 WHERE id='${pet}'`);
  const multiple = JSON.parse(sql(claim(room())));
  assert.equal(multiple.level, 4); assert.equal(multiple.pointsEarned, 3);
  sql(`UPDATE pets SET xp=43475, level=29, unspent_points=28 WHERE id='${pet}'`);
  sql(claim(room()));
  assert.deepEqual(state(), [43500, 30, 29, 10, 7]);
  sql(claim(room()));
  assert.deepEqual(state(), [43525, 30, 29, 10, 7]);
  assert.throws(() => sql(`UPDATE pets SET level=31 WHERE id='${pet}'`));
  assert.equal(sql(`SELECT xp FROM pets WHERE id='${other}'`), '0');
  sql(`UPDATE pets SET is_active=true WHERE id='${pet}'`);
  const parallelRoom = room();
  await Promise.all([
    run(exe('psql'), [...args, '-c', claim(parallelRoom)]),
    ...Array.from({length: 8}, () => run(exe('psql'), [...args, '-c', `SELECT increment_active_pet_xp('${user}', 10)`])),
  ]);
  assert.deepEqual(state(), [43630, 30, 29, 10, 7]);
  assert.throws(() => sql(`SET ROLE authenticated; SELECT increment_active_pet_xp('${user}', 10)`));
  console.log('PASS PostgreSQL: concurrent existing egg XP and Wildwood XP do not overwrite each other');
  console.log('PASS PostgreSQL: 25 XP, replay/reconnect, 8 concurrent claims, 1→2→3, multiple levels, level-30 cap, defeat/active/legacy rejection, ownership, role restrictions, atomic rollback, unrelated pet/stats preserved');
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => {
  if (started) execFileSync(exe('pg_ctl'), ['-D', dir, '-m', 'fast', '-w', 'stop'], { stdio: 'pipe' });
  console.log(`Disposable test cluster: ${dir}`);
});
```
