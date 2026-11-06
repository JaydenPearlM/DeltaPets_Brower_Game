# Traveling Potato — migration applied; battle integration deferred

Migration: `migrations/20261102154932_traveling_potato_effects.sql`.
Applied with explicit user approval on November 2, 2026 to project `uhdpwgybrcizligqypzb`. Supabase recorded version `20261102154932`; the local filename matches it. No unrelated migrations were applied.

## Preserved and extended

Existing singleton state, discovery history, wallet and incubation timestamps remain the sources of truth. No new tables. Existing history remains, including cooldown timestamps. The old item quantity constraint is relaxed from positive to nonnegative because Dots-only/neutral effects award no items.

Claims lock the singleton and compare its location version. Reward, history, cooldown and fallback movement commit together. Two requests for the same version cannot both succeed. Fallback immediately moves to the next allowlisted location, so closing the popup never locks other players out. A discovery UUID authorizes one owner-only relocation until another discovery supersedes it.

Authenticated players can find it at the bottom of home, profile, Kith, hatchery, Kithna, Assanti and Kennith pages. Combat, authentication and other routes are excluded. Artwork is unchanged; the button occupies normal document flow and has a 44px touch target. The existing accessible popup handles focus, Escape and close.

## Approved effects

| Effect | Chance | Outcome |
| --- | --- | --- |
| Potato Power | 20% | +10% battle XP, 30 minutes |
| Warm Potato | 20% | +10% incubation speed, 30 minutes |
| Lucky Spud | 20% | +100 Dots |
| Potato Brain | 10% | -10% battle XP, 15 minutes |
| Rotten Luck | 10% | -10% battle-earned Dots, 15 minutes; no item-drop change |
| Absolutely Nothing | 20% | Dialogue only |

The personal cooldown is two hours, longer than every temporary effect; effects cannot normally overlap. A replacement guard expires prior temporary records. Warm Potato calculates time saved only over its active interval, including new incubations, without changing hatch requirements. A short pets-table write lock during a warm grant closes the concurrent-incubation race; the claim has a five-second lock timeout and rolls back on contention. Other pet writes can briefly wait during that grant. The incubation trigger uses a fixed empty search path and owner privileges to read server-owned effects without exposing history to clients.

## Deferred battle integration (user-approved)

The user explicitly chose to leave the three battle effects pending. Their popup text says no battle reward change is active. The approved roll probabilities remain unchanged; pending outcomes are recorded without applying battle rewards. Do not describe this as a complete/live six-effect system yet. Active Wildwood battles currently record results but do not credit XP or Dots. The instability completion function returns configured XP metadata without crediting it. There is no existing battle reward award operation to modify.

`potato_battle_multiplier(user_id, reward, award_time)` implements the approved multipliers and expiry, but has **no battle award consumer**. Its unit/SQL tests do not prove an actual battle payout. Integrating it requires deciding/implementing the base award path and XP recipient/rounding rules; no base reward or permanent stat changes were invented here. Activation is limited to shared discovery, relocation, Lucky Spud, Warm Potato and neutral dialogue, with the three battle outcomes visibly pending. Completing battle effects requires a separate approved reward implementation.

## Verification

- Frontend production build and backend TypeScript build passed.
- `tools/test-traveling-potato.py`: PostgreSQL 17 disposable container; baseline potato/wallet tables and minimal auth/pets fixture. Covers migration, effect thresholds/durations, concurrent claim, cooldown, immediate fallback, owner-only relocation, stale/duplicate rejection, rollback, hatch calculation/current/new eggs, expiry and RPC grants. Does not reproduce every production trigger/RLS policy.
- `tools/test-traveling-potato-api.cjs`: actual Express handlers and authentication middleware with a database double; auth, identity spoofing, validation, conflict responses, cache prevention and nonleaking errors.
- Browser rendering and authenticated end-to-end gameplay remain unverified.
- The approved potato migration was applied. Read-only checks confirmed all 39 legacy discoveries retained, one singleton, seven locations, enabled hatch trigger, correct warm calculation and server-only RPC permissions. No application deployment, commits or pushes.

Coordinate backend/frontend rollout with the migration: new routes use versioned RPCs, and legacy claim/hide RPCs reject old clients so they cannot bypass atomic checks.
