# DeltaPets Game Expectations and Test Plan

Last reviewed: 2026-08-28

This is a living design and verification document. It separates confirmed
game rules from current implementation observations and decisions that still
need to be made. A successful build does not automatically mark a gameplay
section as verified.

## Status key

- **Confirmed**: explicitly approved game behavior.
- **Implemented**: present in the current code or database.
- **Manually verified**: observed through the running game.
- **Needs verification**: implemented but not yet exercised in this test pass.
- **Needs design decision**: do not invent or silently balance this behavior.
- **Known issue**: reproducible problem that needs a separately approved fix.

## Product invariants

- Desktop behavior and the locked blue-grid visual system remain protected.
- Mobile layouts must support Pixel 10 (`412px`) and Samsung Galaxy S22 Ultra
  (`384px`) without horizontal overflow or inaccessible controls.
- Authentication, ownership, RLS, validation, and server-side authority must
  not be weakened.
- The client must never choose another player's identity for gameplay writes.
- Rewards, encounter rolls, completion, and ownership must be authoritative on
  the server when they affect inventory, pets, progression, or currency.
- Game balance and lore values require an explicit design decision.

## Current project health

| Check | Result | Evidence / limitation |
| --- | --- | --- |
| Backend TypeScript | Pass | `tsc -p backend/server/tsconfig.json` |
| Frontend TypeScript | Pass | `tsc -b frontend/web/tsconfig.json` |
| Frontend production bundle | Pass with warnings | Vite built 210 modules |
| Root `pnpm build` | Environment-blocked | Runtime attempted a non-interactive `node_modules` purge |
| Automated test suite | Not available | No test script is defined in repository manifests |
| Automated lint suite | Not available | No lint script is defined in repository manifests |
| Pixel 10 shell | Pass | `412×915`, no horizontal overflow or clean-load console errors |
| Galaxy S22 Ultra shell | Pass | `384×854`, no horizontal overflow or clean-load console errors |

### Known project-level issues

1. The production build reports unbalanced media-query braces in bundled CSS.
   The warning currently points into CSS containing existing homepage and
   merchant responsive rules. It must be isolated before claiming a clean CSS
   build.
2. All eight elemental `*-delta` rows are missing from `item_defs`. Hatching
   succeeds, but the intended five-elemental-Delta reward is not granted.
3. A React hook-order error can appear during development hot reload after
   hooks are added to `App`. A clean reload resolves it; it has not reproduced
   on a clean application load.

## Test accounts

Use two ordinary non-admin accounts:

- **Account A**: continuing player used for normal progression tests.
- **Account B**: clean player used for onboarding and independent eligibility.

Never use a production player's inventory for destructive or forced-outcome
tests. Record the account and starting inventory before testing rewards.

## Manual test order

Test one section at a time. Stop on unexpected persistent data, ownership,
currency, or security behavior.

### 1. Application startup and authentication

Current expected behavior:

- Closed Alpha access appears before sign-in when required.
- A valid user can sign in and restore their own session.
- Logout clears the active application session.
- Protected routes do not expose another player's data.
- Login or session restoration does not count as roaming.

Checklist:

- [ ] Closed Alpha gate behaves correctly.
- [ ] Account A can sign in.
- [ ] Refresh preserves Account A's session.
- [ ] Logout returns to the expected public state.
- [ ] Account B can complete the intended new-player flow.
- [x] Velune does not appear immediately after login.

Needs design decision:

- Exact intended destination after login, signup, and logout.
- Whether simultaneous sessions on multiple devices are supported.

### 2. Global navigation and responsive shell

Current expected behavior:

- Navigation exposes Home, Pets, Hatchery, Gym, Park, Battles, Cities, and
  Profile according to their existing route guards.
- Desktop retains its existing layout and blue-grid styling.
- Phone layouts contain controls within the viewport and remain touchable.

Checklist:

- [ ] Every visible navigation item opens its intended route.
- [ ] Browser Back and Forward do not corrupt application state.
- [ ] Refreshing every protected route restores correctly.
- [ ] Desktop navigation and overlays remain unchanged.
- [ ] Pixel 10 authenticated screens have no horizontal overflow.
- [ ] Galaxy S22 Ultra authenticated screens have no horizontal overflow.
- [ ] Modals, inventory, and popup buttons remain reachable at both widths.

### 3. New-player creation and starter flow

Current expected behavior to verify:

- A new account completes the current creation/cutscene sequence.
- The starter egg and starter ownership belong only to that account.
- Refreshes do not duplicate the starter reward.

Checklist:

- [ ] Account B completes creation.
- [ ] Starter selection/reveal follows the intended sequence.
- [ ] Exactly one starter egg or starter Kith is created.
- [ ] Replaying or refreshing cannot duplicate the starter.
- [ ] Account A is unaffected by Account B's choices.

Needs design decision:

- Final wording and skip/replay rules for every onboarding cutscene.
- Whether players may ever change or obtain another starter.

### 4. Hatchery, eggs, and hatching

Current expected behavior:

- Storage eggs can be moved into valid incubator slots.
- Incubation timing persists across refresh and logout/login.
- An egg cannot hatch early through client manipulation.
- Hatching creates one owned Kith and removes the egg state exactly once.
- Rolled individual traits stay attached to that Kith.

Checklist:

- [ ] Ordinary egg moves from Storage to an incubator.
- [ ] Timer survives refresh and logout/login.
- [ ] Duplicate hatch requests cannot hatch twice.
- [ ] Hatched Kith has the correct species, line, stats, and traits.
- [ ] Party-full behavior sends the Kith to Storage.
- [ ] Elemental Delta reward is verified after its missing definitions are fixed.
- [ ] Hatchery works on desktop, Pixel 10, and Galaxy S22 Ultra.

Needs design decision:

- Final timers and balance for every species not already confirmed.
- Intended behavior when the Hatchery and Storage are both full.

### 5. Pet Storage and Main Team

Current expected behavior:

- Players see and move only their own Kith.
- Eggs never enter the battle party.
- Party slots do not duplicate the same Kith.
- Storage and party state survive refresh and login changes.

Checklist:

- [ ] Move an eligible Kith into each party slot.
- [ ] Move it back to Storage.
- [ ] Drag, touch, and Options controls agree.
- [ ] Full-party and duplicate-pet errors are understandable.
- [ ] Account B cannot see or move Account A's Kith.

### 6. Pet profile, stats, traits, and progression

Current expected behavior to document during testing:

- Pet identity, species, element, stage, level, XP, stats, personality, bond,
  growth traits, mutations, skills, and description render from persisted data.
- Player-visible stats match server values after refresh.

Checklist:

- [ ] Pet detail fields match database-backed ownership data.
- [ ] Stat allocation obeys limits and cannot be replayed.
- [ ] XP changes appear consistently across all views.
- [ ] Personality, growth traits, and mutations remain stable.
- [ ] Missing artwork has an acceptable fallback.

Needs design decision:

- Complete level curve and maximum levels by form.
- Evolution requirements and final names for unfinished species.
- Exact relationship between XP, stats, bond, training, and evolution.

### 7. Care and daily care

Current expected behavior to verify:

- Care actions affect only the selected owned Kith.
- Inventory consumption and resulting care changes happen together.
- Cooldowns and daily completion persist server-side.
- A repeated request cannot duplicate daily rewards.

Checklist:

- [ ] Feed, clean, play, rest, and bond actions use valid inventory.
- [ ] Care values stay within their defined bounds.
- [ ] Cooldowns survive refresh and login changes.
- [ ] Daily care completes once per intended Delta day.
- [ ] Daily rewards cannot be replayed.
- [ ] Neglect and runaway behavior matches the intended timing.

Needs design decision:

- Final care decay rates and neglect/runaway balance.
- Exact daily reset boundary and timezone presentation.

### 8. Inventory, currencies, and weekly rewards

Current expected behavior:

- Inventory and wallet data are owned per player.
- Server endpoints control grants, spending, and reward claims.
- Refreshes or simultaneous requests do not duplicate rewards.

Checklist:

- [ ] Inventory quantities match before and after item use.
- [ ] Currency spending cannot make balances negative.
- [ ] Weekly claim succeeds once when eligible.
- [ ] A replayed weekly claim gives nothing extra.
- [ ] Mobile inventory remains scrollable and closeable.

### 9. Kithna city and merchants

Current expected behavior:

- Kithna city connects to Food, Health, Armor, and Weapons merchants.
- Merchant interactions use the authenticated player's wallet/inventory.
- Closed or unfinished merchants communicate their status without breaking
  navigation.

Checklist:

- [ ] Enter and leave each Kithna merchant.
- [ ] Purchase success updates wallet and inventory once.
- [ ] Insufficient funds leaves both unchanged.
- [ ] Repeated clicks cannot duplicate a purchase.
- [ ] Desktop and both phone widths retain readable merchant controls.

Needs design decision:

- Final prices, stock, refresh rules, and merchant schedules.

### 10. Ordinary Kithna roaming encounters

Current expected behavior:

- Ordinary Kithna roaming uses the existing server chance and cooldown.
- A pending egg encounter survives navigation as currently implemented.
- Taking or leaving an encounter resolves it once.

Checklist:

- [ ] No encounter occurs before its eligibility requirements.
- [ ] Cooldown prevents repeated navigation spam.
- [ ] Taking an egg creates exactly one owned egg.
- [ ] Leaving awards nothing.
- [ ] A pending encounter cannot be claimed twice.

Needs design decision:

- Whether the current frequency, cooldown, and pending-encounter persistence
  are final game rules.

### 11. Velune roaming Legendary

Confirmed behavior:

- Velune is an Air Mythical Legendary and protector of Kithna.
- No battle and no direct capture.
- Only Kithna city and its Food, Health, Armor, and Weapons merchants are
  eligible locations.
- Login and initial page load do not count as roaming.
- Eligible navigation has a 40% sighting chance.
- Each legitimate sighting has a 5% server-side Legendary Egg chance.
- Completion permanently stops Velune sightings for that player.
- The Legendary Egg incubates for 45 minutes.
- Hatched Velune remains named Velune only as a Hatchling.
- Trainer Level 10 is required for active/party/battle use.

Checklist:

- [x] Login does not trigger a Velune roll.
- [ ] Non-Kithna routes cannot trigger Velune.
- [ ] Forced failed roll produces no popup and no egg.
- [ ] Forced sighting produces the global cyan/purple popup and no battle.
- [ ] Failed 5% egg roll gives nothing.
- [ ] Successful roll creates exactly one Legendary Egg.
- [ ] Refresh, multiple tabs, and replay cannot create another egg.
- [ ] Logout/login retains completion.
- [ ] Account B remains independently eligible.
- [ ] Incubation lasts 45 minutes.
- [ ] Hatch reveals Velune and sends locked Velune to Storage.
- [ ] Below Trainer Level 10, activation, party, and battle are rejected.
- [ ] Pixel 10 and Galaxy S22 Ultra popup layouts are usable.

Needs design decision:

- Velune's future form names, skills, final level behavior, and remaining
  long-term balance values.

### 12. Battles

Current expected behavior to verify:

- Only owned, eligible party Kith enter battle.
- Actions apply to the active battle and cannot target invalid units.
- Victory and defeat resolve once without replayed rewards.

Checklist:

- [ ] Start PVE with an ordinary eligible party.
- [ ] Basic attack, guard, skills, status effects, and turn order behave.
- [ ] Victory and defeat end the battle correctly.
- [ ] Refresh/replay cannot duplicate battle completion or rewards.
- [ ] Locked Velune is rejected before battle creation.
- [ ] Battle screens remain usable at both phone widths.

Needs design decision:

- Final battle rewards, enemy balance, skills, and difficulty curves.
- Battle Legendary encounters remain explicitly out of Velune's scope.

### 13. Profile, achievements, titles, and Trainer Level

Current expected behavior:

- Profile data belongs to the authenticated player.
- Earned titles and achievements remain persistent.
- Trainer Level is server-owned and displayed on Profile.

Checklist:

- [ ] Profile identity and joined date are correct.
- [ ] Active title persists and bonuses apply only when intended.
- [ ] Achievements cannot be claimed or displayed for the wrong user.
- [ ] Trainer Level displays the server value after refresh.

Needs design decision:

- Trainer XP sources, thresholds, maximum level, and presentation.
- Achievement completion criteria and final rewards.

### 14. Poe Tay Toe and other special systems

Current expected behavior:

- Poe Tay Toe remains separate from Velune.
- Existing ownership, cooldown, and reward behavior must not be affected by
  Legendary work.

Checklist:

- [ ] Poe Tay Toe can be hidden, found, and claimed as currently designed.
- [ ] Duplicate or cross-account claims are rejected.
- [ ] Velune navigation does not interfere with Poe Tay Toe popups.

Needs design decision:

- Poe Tay Toe event Kith behavior is a separate future specification.

## Session test record template

Copy this block under the relevant section for each test:

```text
Date/time:
Tester/account:
Device and viewport:
Starting page/state:
Action:
Expected:
Observed:
Result: Pass / Fail / Blocked
Screenshot or log:
Persistent data changed:
Follow-up decision:
```

## Design decision template

Use this when defining a missing game rule:

```text
System:
Player-facing goal:
Trigger or eligibility:
Frequency or cooldown:
Server-owned data:
Success result:
Failure result:
Duplicate/replay behavior:
Desktop behavior:
Mobile behavior:
Final wording/lore:
Values explicitly approved:
Values still undecided:
```
