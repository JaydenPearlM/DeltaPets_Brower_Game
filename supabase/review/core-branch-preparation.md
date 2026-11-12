# Core branch preparation — 2026-11-11

Status: local repairs verified; NOT ready for production deployment or an unqualified merge. No production SQL, migration-history writes, commits, pushes, or merges were performed.

## Migration reconciliation

Verified recorded remote migration statements before aligning these local filenames. SQL contents were preserved. Four pairs match after newline normalization; recovery payment differs only in comments. Remote history remains unchanged.

| Original local version | Recorded remote version |
| --- | --- |
| 20261031000000 | 20261031015143 |
| 20261031023721 | 20261031024726 |
| 20261101000000 | 20261101161856 |
| 20261101125225 | 20261101130407 |
| 20261104134447 | 20261104165826 |

Updated three test scripts that referenced the renamed files. Historical review documents retain their original filenames as historical references.

Inspected current remote functions, constraints, triggers and relevant privileges using read-only queries. Confirmed level-30 constraints, equipment ownership foreign keys/RLS, equipped-inventory protection, and inventory uniqueness. The supplied schema dump also records the older deployed Hatchery/storage/Wildwood definitions. Backup directories contain duplicate and differing historical SQL; none were restored or staged.

## Exact outstanding migration list

The normal `pnpm exec supabase db push --dry-run` fails because 13 older local versions are absent from history. `pnpm exec supabase db push --dry-run --include-all` exits 0 and lists the following 16 files. This only enumerates SQL; it does not validate execution or deploy anything. Do NOT remove `--dry-run`.

| Migration filename | Assessment / risk |
| --- | --- |
| 20261023192950_preserve_unclaimed_daily_xp.sql | Genuinely absent behavior: live XP claims still advance without an eligible active pet. Superseded locally by later daily-reward replacements. |
| 20261023235736_poe_tay_toe_dots_only.sql | Obsolete/unsafe replay candidate: live two-argument RPC now returns `refresh_required` without awards. Reapplying would restore an older reward path. Keep current protection. |
| 20261024012139_day_seven_100_dots.sql | Pending daily-reward behavior; live function still awards the ribbon. Superseded locally by the stack-limit replacement. |
| 20261024013421_require_hatchery_slot_to_hatch.sql | Pending Hatchery membership check absent from the live context-bearing overload. Requires separate reviewed rollout. |
| 20261025000000_assanti_daily_stock.sql | Explicit review-only finite-stock proposal; its tables are absent. Changes merchant behavior and price data. |
| 20261025030424_require_main_team_before_activation.sql | Pending Main Team membership check absent from live storage function. |
| 20261025031316_atomic_rescue_egg.sql | Pending; grant_rescue_egg is absent remotely. Requires coordinated backend rollout. |
| 20261025043221_enforce_daily_reward_stack_limits.sql | Pending final daily-reward replacement, including earlier daily XP/day-seven changes. |
| 20261026002000_merchant_stock_cap_199.sql | Depends on absent review-only finite-stock table. Not safe independently. |
| 20261026003000_assanti_food_purchase_limit_99.sql | Changes existing merchant limits and depends on finite-stock design. Not approved by this repair task. |
| 20261026010000_atomic_wildwood_item_claim.sql | Already represented: live function body matches ignoring comments/formatting; item_claimed_at exists. Rerunning its ADD COLUMN would fail. Metadata reconciliation still needs final full-definition/privilege verification. |
| 20261027010000_assanti_atomic_basket.sql | Explicit review-only proposal; missing tables and unconfigured potion economy values. |
| 20261027125335_assanti_merchant_compatibility_repair.sql | Alternative proposal explicitly rejects the finite-stock tables created by earlier drafts. These proposals cannot be pushed together. |
| 20261110181755_wildwood_kithna_discovery_catalog.sql | Pending; installs catalog and first claim implementation. Must be followed by Treasure migrations before enabling collection. |
| 20261111170000_wildwood_visit_treasure.sql | Pending; creates temporary Treasure and transfer/discard RPCs. Existing permanent inventory is not rewritten. |
| 20261111181527_wildwood_treasure_readiness.sql | New forward-only correction: readiness v2 and player locking across claim/transfer/discard; closes existing collectible rooms on departure to reject late claims. Preserves privileges and battle state. |

## Treasure corrections and verification

- Fixed embedded item relation handling that caused five backend TS2339 errors.
- Fixed transfer requests to use the existing API client's `json` option, which supplies Content-Type.
- Require readiness v2 so the intermediate direct-to-inventory claim implementation cannot be enabled as Treasure.
- In-app route departure waits for pending collection and confirmed Treasure discard. Failure keeps the player on Wildwood with a useful error. Empty/disabled Treasure does not trap navigation.
- Server claim/transfer/discard operations serialize per player. Discard only marks untransferred Treasure and closes collectible rooms; it never removes permanent inventory or changes battle payloads.
- Eggs tab does not display owned Hatchery eggs as new Treasure. Egg discovery itself remains the existing system; temporary egg Treasure is not implemented.

Remaining limitation: browser/tab closure, external navigation, failed initial Treasure loads and offline exits are not authoritative visit termination. The router guard covers in-app navigation only. A complete server-backed visit lifecycle must be reviewed before claiming universal leave-expiration; no arbitrary expiration duration was invented.

## Checks

- Backend build: PASS after fixing the reported relation errors.
- Frontend build: PASS.
- Offline discovery contracts: PASS, including readiness mismatch and legacy direct-inventory rejection.
- Wildwood integration repository-double checks: PASS.
- Battle engine: 14 checks PASS; no battle-engine code changed by this repair.
- Disposable PostgreSQL Treasure checks: PASS for all three migrations, temporary claims, ownership, eight concurrent transfers (one success), stack limits, late-claim/departure race, permanent ownership and restricted roles.
- Disposable PostgreSQL progression checks: PASS, including concurrent XP, replay, ownership, rollback and existing stats.
- Offline browser fixture: PASS at 1440/1920/412/384/360px, battle actions, Treasure transfer, Hatchery separation, departure error/retry and visit progress.
- Production concurrency and actual player sessions were not exercised.
- Initial local PostgreSQL/browser attempts failed under sandbox restrictions; reruns with approved local access passed. No dependencies installed.

## Git and staging

Active branch remains Core_Systems_version_1. Local main is two commits ahead of HEAD; its only file difference is render.yaml (automatic deployments disabled). No overlapping file conflict identified against that local ref; remote refs were not refreshed, so current remote conflicts remain unverified.

Existing source/artwork additions, modifications and deletions were preserved. Backup archives, AGENTS_backup.md, raw remote evidence/schema dumps and temporary files must remain excluded. A filename/text scan of 61 candidate text files found no obvious private-key/token patterns; this is not a complete secret audit.

Staging is withheld under the request's stop-on-unexpected-changes rule: the migration directory contains incompatible merchant proposals, an older RPC replacement that would undo the current disabled path, and an already-present ADD COLUMN. Resolve the rollout classification and visit-lifecycle limitation before commit/push/merge. No staging, commit, push, merge or deployment is represented as complete.

Next safe command: `git diff --stat` to review the preserved working tree. Do not run a real database push from this migration directory.
