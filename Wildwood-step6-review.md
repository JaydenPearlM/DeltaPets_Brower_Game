# Wildwood Step 6 — preparation review

Only `frontend/web/src/pages/Cities/Kithna/Wildwood/wildwood.css` changed in this step: explore-button top spacing reduced from 24px to 12px; direct event paragraphs use 8px/12px margins and 1.5 line height. Existing user changes were preserved. No gameplay or database actions were performed.

## Roster and egg integration

- `backend/server/src/shared/pets/species/kithna-species.ts`: active roster is Clodian (uncommon/day), Pebelin (common/day), Magmado (rare/night), Shade (common/night), Glimmer (epic/night). The requested “Clodion” is currently named `Clodian`, ID `kithna_clodian`; no rename was made.
- Species rarity, encounter weights and day/night availability are configurable in source. There is no path-range configuration in this roster. `getKithnaEggsForTime` filters enabled species by Delta time.
- `backend/server/src/routes/cities/kithna/wildwoodBattleService.ts`, `corruptedEnemy`: selects from that time-filtered pool using encounter weights, creates a level-one enemy with rolled IVs. Smallest future roster seam: supply an approved Wildwood-specific pool here using server-owned room sequence, without changing the shared city egg pool or existing species records.
- `WildwoodPage.tsx`: successful exploration of a non-battle room calls `/api/kithna/roam`, without path context. Corruption is not depth-gated by this UI; corrupted scenery takes priority at every positive path. Path zero remains the entrance, not a new encounter rule.
- `backend/server/src/routes/cities/kithna/kithnaEncounter.ts`: roam uses a 60-second cooldown, requires a hatched pet, and has a 45% find roll. Pending encounters are returned first. Selection uses the day/night pool and weighted species choice, with a separate Voidborne branch if eligible species exist. These are current implementation settings, not proposed percentages.
- `backend/server/src/shared/pets/eggQualityRoll.ts`: quality uses species rarity for growth traits, an active passive-trait roll, and mutation capacity. The existing alpha hatch-time override is two minutes. No path/depth input exists.
- Future egg-strength integration should resolve authenticated Wildwood room/sequence on the server before pool/quality selection and retain the selected result through take/leave. Do not trust a client-supplied depth or change generic city roaming unintentionally. Exact strengths, rarity curves, thresholds, rewards and schema needs remain undecided. Keep this independent from corruption selection.
- Current exploration increments room sequence without a service-level 100-path stop. The frontend caps display only. Completion/reset behavior is future gameplay work.

## Battle transition

1. Explore creates the server battle snapshot if a corrupted event occurs. The frontend first shows an encounter; Continue to battle sets `showBattle`. Reloading an active battle opens the battle UI directly.
2. The server selects the first living team member in existing order (`filter(...).slice(0, 1)`), alongside one generated enemy. The UI uses `activeParticipantId` to determine whose command is available.
3. Attack, Element Strike and Mend use target selection; Guard submits immediately. Requests include actor and turn number. The server engine validates/resolves the action and automatically advances enemy turns until the player acts again or the battle ends.
4. `actInWildwood` saves the room's battle snapshot/status with a revision check. Terminal outcomes are upserted into `pet_battle_results` keyed by battle and pet. Ownership is checked; duplicate results are ignored.
5. Versioned victories call `settle_wildwood_victory_xp`; the service validates the returned 25-XP receipt, previous/current levels (up to 30), and earned stat points. The UI displays that receipt. Database function internals and live Level 2 records were not inspected or altered in this step.
6. Return to Wildwood reloads session/team/status, hides the battle if no longer active, and returns to the prepared exploration layout. An active battle cannot be bypassed by this return path.
7. Existing issues to consider next: action responses contain an empty team until reload; a status-fetch failure can leave a saved result behind an error until retry; the shared busy label says “Resolving your action…” during return reload too. Battle component remounting by turn resets command choice. Recent Finds records an egg on toast dismissal after either take or leave, so it represents discoveries rather than confirmed acquisitions. Optional roam failures are logged only in development. These were left unchanged rather than altering collection, API or combat behavior.

## Verification and next work

- `pnpm --dir frontend/web build`: passed (TypeScript and Vite).
- Scoped `git diff --check`: passed.
- Source assertions: four team slots, 5px team gap, four Recent Finds categories, capped existing path source, entrance/corruption scene selection, 16:9 viewport, existing explore and encounter handlers all passed.
- No live gameplay, browser/mobile visual testing, XP settlement or production-data checks were performed. Existing responsive rules and scenery were retained.
- Next task: approve battle presentation/transition requirements and recovery behavior; design individual beginner species; approve independent egg-depth and roster-depth policies; decide Path 100 behavior. No animations, combat controls, spawn rules or persistence changes were implemented here.
