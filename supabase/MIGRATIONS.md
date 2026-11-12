# Migration workflow

`supabase/migrations` is the recorded history for the existing Deltapets database plus any newly reviewed forward migrations. `migration_archive` preserves excluded historical drafts and unrecorded equivalents; it is not a deployment queue.

## Reconciliation — 2026-11-12

The failing push had two causes: remote versions absent locally, and 13 local-only historical files mixed into the runnable queue. The 13 files are now preserved byte-for-byte in the archive, with classifications and checksums.

Two local filenames were aligned with actual remote versions, with SQL contents unchanged:

| Original local version | Canonical applied version | Name |
| --- | --- | --- |
| 20261110181755 | 20261111184310 | wildwood_kithna_discovery_catalog |
| 20261111170000 | 20261111184319 | wildwood_visit_treasure |

Recorded remote SQL and local SQL match after comment/whitespace normalization. No applied migration was reverted, no remote history was rewritten, and no application/player data was modified by this reconciliation. The earlier five historical filename alignments remain intact.

## Existing linked database

Confirm `supabase/.temp/project-ref` identifies the intended database before any operation. Review `pnpm exec supabase migration list --linked`, then `pnpm exec supabase db push --linked --dry-run`. A clean reconciliation should report the database up to date. Review every future pending SQL file before a real push. Do not use `repair --status reverted` merely because a local filename differs.

## Fresh database limitation

This is an existing-database history reconciliation, not a fresh-database bootstrap. The remote readiness version `20261111181527` sorts before its catalog/Treasure prerequisites, which were applied earlier in practice under later recorded timestamps. There are also historical manually applied objects. Applied SQL/version identities have deliberately not been rewritten to hide this history.

Do not use this history as an unattended empty-database reset/bootstrap. A separately reviewed schema baseline is needed for that workflow. Focused Treasure tests explicitly apply prerequisites before readiness and eggs; they do not claim to validate a full reset.

The migration conflict sections of `review/final-core-verification.md` and `review/core-branch-preparation.md` describe the state before this reconciliation and are superseded here. Their gameplay verification limitations remain applicable.

## Verification

- `migration list --linked`: all 36 local versions match remote history.
- `db push --linked --dry-run`, with and without `--include-all`: both report "Remote database is up to date."
- `node tools/check-wildwood-discoveries.cjs`: passed.
- `node tools/check-wildwood-treasure-db.cjs "C:/Program Files/PostgreSQL/17/bin"`: passed, including egg/item transfer concurrency, failed-transfer rollback, ownership, XP replay and access restrictions on a disposable local cluster.
- Archive SHA-256 checks and exact SQL comparison to Git (normalizing checkout line endings): passed for all 13 files. Checksums describe the bytes at archival time; Git may normalize line endings on another platform.
- No application source, gameplay values or dependency files changed, so the earlier application builds were not repeated for this file-layout correction.
