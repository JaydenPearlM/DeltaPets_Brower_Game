# Core branch verification — 2026-11-12

This report supersedes the rollout status in core-branch-preparation.md. No production deployment or main merge was performed. The user subsequently requested that the GitHub push remain pending and Render access be skipped.

## Database execution

The user explicitly confirmed linked project uhdpwgybrcizligqypzb (Deltapets) as the authorized development database.

- Existing five historical filename alignments were verified against recorded remote statements; equivalent SQL after comment/whitespace normalization. No applied history was reverted or SQL rewritten.
- Catalog local version 20261110181755 is equivalent to remote 20261111184310; Treasure local version 20261111170000 is equivalent to remote 20261111184319. Both were already applied and skipped.
- Applied 20261111181527_wildwood_treasure_readiness.sql, then 20261111185111_wildwood_egg_treasure.sql using Supabase CLI 2.104.0.
- CLI migration fetch populated an isolated temporary project with actual remote history. Only the two reviewed files were added. An include-all dry run listed exactly those two files before the real push. No historical October SQL was replayed.
- Exact pending SQL was reviewed: no destructive top-level statements or existing-player rewrites. Egg creation uses the existing storage RPC atomically; failed storage rolls back. New functions are SECURITY INVOKER with empty search_path and service-only execution.
- Post-application read-only verification: readiness version 2; both versions recorded; claim, item transfer, discard, egg hold and egg transfer exist, are invoker functions, deny anon/authenticated execution and allow service_role. Treasure table retains RLS and service-only privileges.

## Remaining migration-history conflicts

The repository migration directory is NOT safe for an unfiltered push or a fresh sequential replay. The two additional catalog/Treasure timestamp discrepancies remain documented, without falsifying history or changing original SQL/version identities. Renaming them alone would put the already-applied readiness version before its prerequisites. Resolving the canonical replay history needs a separately reviewed approach.

The 13 October local-only versions remain untouched:

- 20261023192950 and 20261024012139: earlier daily-reward replacements superseded locally by 20261025043221; do not replay independently.
- 20261023235736: obsolete reward RPC replacement; would restore a disabled legacy award path according to the earlier schema review.
- 20261024013421, 20261025030424, 20261025031316, 20261025043221: pending Hatchery, Main Team, rescue and daily-reward work requiring independent rollout review; rescue explicitly requires coordinated backend rollout/traffic pause.
- 20261025000000, 20261026002000, 20261026003000, 20261027010000: finite-stock merchant proposals/dependencies; incompatible with preserving current merchant behavior without separate review.
- 20261027125335: alternative merchant compatibility proposal, incompatible with finite-stock drafts.
- 20261026010000: existing equivalent behavior reported by the prior full-definition review; not replayed or marked applied in this pass.

## Fresh verification

All commands passed:

- pnpm --dir backend/server build
- pnpm --dir frontend/web build
- node tools/check-wildwood-eggs.cjs
- node tools/check-wildwood-discoveries.cjs
- node tools/check-wildwood-integration.cjs
- node tools/check-battle-engine.cjs (14 checks)
- node tools/check-wildwood-treasure-db.cjs "C:/Program Files/PostgreSQL/17/bin"
- node tools/check-wildwood-progression.cjs "C:/Program Files/PostgreSQL/17/bin"
- node tools/check-wildwood-ui.cjs

Disposable PostgreSQL checks exercised temporary egg receipt, ownership, eight concurrent transfer attempts with one success, storage destination/capacity, rollback retaining the egg, permanent ownership preservation, XP replay/concurrency and existing item transfers. Browser fixtures exercised Treasure Eggs visibility, failed egg transfer retention and successful transfer, plus desktop/mobile layouts and departure retry. Handler tests exercise temporary acceptance without permanent inserts and retry safety.

These are local fixtures, not authenticated end-to-end player sessions against the development database. No player-data mutation was used for verification. Browser closure/offline departure remains outside the guaranteed in-app discard flow. No gameplay values or styling were changed during this verification pass; existing work is preserved in the commit.

Staged-content review found no excluded paths or matches for the checked private-key/token/credential-URL patterns across 94 added/modified/renamed files (not a comprehensive secret audit). The staged whitespace check reports one pre-existing extra blank line at KithPortrait.tsx:35; retained unchanged. Existing legitimate deletions and five byte-identical migration renames are included.

## Read-only cleanup audit

Nothing was removed, renamed or relocated by this audit.

| Candidate | Tracked before commit | Reason / risk |
| --- | --- | --- |
| backups/ | No | Historical source/JSON checkpoints and twiglet-error-*.png; may be unique recovery evidence, compare before removal. |
| supabase/migrations_backup/ (including nested migrations/) | No | Duplicate historical trees; some SQL differs, so do not assume every copy is redundant. |
| supabase/review/current_remote_schema.sql, remoteFunctions.json, remoteMoreFunctions.json, migration-history-evidence.json, final-history-private.json, git-status-before.txt | No | Private/generated database or working-tree evidence; excluded from commit, preserve until review is complete. |
| AGENTS_backup.md | No | Old instruction backup; compare before removal. |
| frontend/retired/legacy-care-inventory.txt | No | Retired implementation backup outside runtime source; excluded, may retain useful history. |
| frontend/pet_items.zip | Yes | Archive beside active item definitions; verify unique contents before removal. |
| frontend/web/src/kith/assets/eggs/eggs.zip | Yes | Asset archive beside runtime assets; verify source artwork before removal. |
| output/DeltaPets-Hatchlings-CSP-References.zip | Yes | Export/reference archive; may be an intentional deliverable. |
| backend/server/dist/, frontend/web/dist/ | No, ignored | Regenerable build outputs; needed for local serving until rebuilt. |
| Temporary wildwood-ui-*, wildwood-treasure-*, wildwood-xp-test-* and deltapets-reviewed-migrations-20261112 directories | Outside repository | Test screenshots/clusters and isolated migration copy; stopped test clusters, retain until evidence is no longer needed. |

New battle back-sprite assets are explicitly imported by battleBackSprites.ts; no deletion candidate was inferred from their filenames. No redundant video was established.

## Before a manual main merge

Resolve/document the canonical migration replay policy and deferred October changes; perform an authenticated development smoke test; decide whether broader visit-expiration guarantees are required. Confirm deployment settings before any future push/merge: this branch's render.yaml has autoDeploy: true, and live Render settings were not inspected at the user's request. Remote target branch matched HEAD before committing (0 ahead / 0 behind).
