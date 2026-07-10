# Inventory + Kithna Egg Flow Patch — 2026-07-10

Unzip this directly over your project root (`frontend/`, `backend/`,
`supabase/` folders line up with your existing structure). All files are
complete drop-in replacements except the 3 new migration files, which are
new additions.

## 1. Run these migrations first, IN ORDER, via Supabase Dashboard SQL Editor

1. `20260710000001_seed_item_defs.sql` — seeds `item_defs` with real rows
   for `starter_equipment`, `potion_small`, and the 4 care items. Fixes
   the weekly reward crash (`Missing item_defs slug`) and gives care items
   a real backend row.
2. `20260710000002_add_pet_location_inventory.sql` — adds `'inventory'` as
   a valid value on the `pet_location` enum. Must run before #3 and before
   deploying the code, since the roam route now inserts eggs with
   `location: 'inventory'`.
3. `20260710000003_add_pending_hatch_minutes.sql` — adds
   `pets.pending_hatch_minutes`, used to carry the rolled incubation time
   forward from "found" to "started incubating."

## 2. What changed and why

**Inventory modal never opened.** `openInventory()` existed but nothing
called it. Added an "Inventory" entry to the hamburger menu in `App.tsx`.

**Care items were permanently unobtainable.** `ensureStarterCareInventory()`
only ever created an *empty* local inventory, and nothing else legitimately
granted food/soap/toy/pillow. `consumeCareItem()` always failed, so
feed/clean/play never worked for any player. Fixed in `inventory.tsx`:
starter grant now seeds 5 of each care item.

**Backend `inventory` table was write-only.** `rewards.ts` already wrote to
it, but nothing ever read it back for the frontend. Added
`GET /api/inventory` (`backend/server/src/routes/inventory/inventory.ts`,
mounted in `routes/index.ts`). The Inventory modal now shows a "Rewards"
section pulling real data from this route, separate from the local
care-item section (intentionally kept separate, see comments in
`inventory.tsx`).

**Kithna roam eggs no longer auto-incubate on find.** Previously, finding
an egg immediately placed it in an open hatchery slot and started the
hatch timer with no player choice. Now:
- `POST /api/kithna/roam` inserts the egg with `location: 'inventory'`,
  `hatch_ends_at: null`, and the rolled duration saved in
  `pending_hatch_minutes`.
- A new non-popup "Kithna Eggs" panel renders on the Homepage directly
  under the DeltaPets banner (`KithnaEggTray.tsx`), only for logged-in
  users with eggs sitting in inventory. It stays visible until dismissed
  or the eggs are moved, unlike the old 5-second toast.
- Two new player actions in `usePetStorage.ts`:
  - `moveEggFromInventoryToStorage` — holds the egg in Storage, no timer.
  - `moveEggFromInventoryToHatchery` — assigns an open hatchery slot and
    starts the timer using `pending_hatch_minutes` (falls back to 3
    minutes if missing).
- Existing `moveEggToIncubator` (Storage → Hatchery) also now honors
  `pending_hatch_minutes` if present, so an egg can go
  inventory → storage → hatchery later and still get its rolled duration.
- The old `RoamEncounterToast` popup is left untouched and still fires as
  a "you found something" notification; the egg itself now lands in
  inventory instead of auto-incubating.

**Storage minimum-1-pet rule** — already existed in `usePetStorage.ts`
before this patch (`storePet` / `returnPartyPetToStorage` throw if it
would empty the Main Team). No changes needed there.

## 3. Manual test checklist

- [ ] Run all 3 migrations in order.
- [ ] Log in, trigger a Kithna roam find (navigate around `/cities/kithna`
      until the toast fires). Confirm the egg does NOT show up already
      incubating in the Hatchery.
- [ ] Confirm the "Kithna Eggs" panel appears on the Homepage under the
      DeltaPets banner with the found egg listed.
- [ ] Click "Send to Storage" on one egg — confirm it disappears from the
      tray and appears in Storage on the Hatchery page.
- [ ] Find or use another egg, click "Start Incubating" — confirm it
      disappears from the tray and appears as an incubating egg on the
      Hatchery page with a countdown.
- [ ] From Storage, move the stored egg into the incubator via the
      existing Hatchery UI — confirm it still gets a real countdown, not
      an immediate/zero timer.
- [ ] Open the hamburger menu, click "Inventory" — confirm the modal
      opens (previously did nothing).
- [ ] In the Inventory modal, confirm "Care Items" shows 5x of each
      starter item instead of empty.
- [ ] On PetPage, feed/clean/play your pet — confirm the action succeeds
      and consumes a care item (previously always failed).
- [ ] Claim a weekly reward that hits "Starter Equipment" or "Potions x3"
      — confirm it no longer 500s, and the item appears under "Rewards"
      in the Inventory modal.

## 4. Deliberately left untouched

- Care Status panel — not touched, not named in this request.
- Party size (still 4), locked blue grid system, merchant UI, roaming
  encounter chance (still 80% test value), starter Mystery Egg flow.
- `null_element` naming — untouched.
- Rescue-egg flow from the earlier recovery-flow doc — not built yet,
  separate task.
