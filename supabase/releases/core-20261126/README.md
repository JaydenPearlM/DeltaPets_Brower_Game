# Core database release — 2026-11-26

These are separate Supabase CLI workdirs. Never combine them or run a fresh bootstrap against an existing database. No migration application is authorized by this package.

- `fresh`: one tested application bootstrap on an initialized compatible Supabase platform (postgres 17.6.1.063). Verify empty application/Auth state, platform roles/extensions/event triggers, target identity, backup/recovery readiness and explicit-target dry-run. Uses postgres application ownership. No historical stamps or test probes.
- `existing`: all 42 immutable historical files plus `20261126051000_restrict_client_privileges.sql`. ASKA must have exactly the 42 predecessor versions. The correction transaction revokes 132 excessive client privileges across 26 objects; it does not change player rows, owners or defaults. Requires existing supabase_admin authority. Do not grant membership to make execution work.

Run `node supabase/releases/core-20261126/verify.cjs existing` (or `fresh`) before any CLI operation. Each checksum manifest is an exact filename/content allowlist. Check the manifests themselves against the approved commit manifest. Credentials, private backups and test output never belong here.

For ASKA, use the verified loopback target 127.0.0.1:54322/postgres and the existing authorized owner connection. Use the corresponding workdir and `supabase db push --db-url <explicit-target> --workdir <lane> --dry-run`. Supply credentials privately; do not echo URLs or enable debug logging. Review that the existing lane lists ONLY the forward correction. Do not use linked-project inference, include-all, seed, role application, reset, migration repair or historical replay. CLI history does not validate historical statement equality: separately verify genuine target history and document the two previously reviewed historical SQL discrepancies; reject unexpected drift.

The local preparation script performs the dry-run with default_transaction_read_only=on and checks history/data preservation. Applying needs separate user approval and a current verified recovery checkpoint. Serialize execution and recheck identity, hashes, history and ACL preconditions immediately beforehand. After any approved application, verify exactly one new history record, unchanged old history/player rows, expected ACL reductions and gameplay. Do not automatically restore over player data on failure.

The existing correction is NOT a future migration for the fresh lane: fresh bootstrap already contains its security corrections and has a different lineage. Future common migrations must be later than both cutovers and reviewed/tested against both lineages. Preserve the repository's original 42 files permanently.

HECTOR compatibility is accepted per the user; this package preparation did not access HECTOR or production. Saved isolated bootstrap and existing-upgrade gameplay/RLS rehearsals are reused. Local authentication/Kithna smoke-test scope and recovery evidence are recorded in the private release-preparation manifest, outside this commit package.
