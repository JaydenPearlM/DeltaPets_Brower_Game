# Preserved SQL outside the runnable migration queue

These files are historical proposals or unrecorded equivalents, not pending deployment instructions. They were moved byte-for-byte from `supabase/migrations` on 2026-11-12. Original names and SQL are preserved; `checksums.json` records SHA-256 hashes. None were executed or marked applied/reverted during this reconciliation.

| Version | Classification / reason excluded |
| --- | --- |
| 20261023192950 | Earlier daily-XP replacement; superseded by the archived final daily-reward draft. |
| 20261023235736 | Obsolete Poe Tay Toe reward replacement; risks restoring a disabled legacy award path. |
| 20261024012139 | Earlier day-seven reward replacement; superseded by the final daily-reward draft. |
| 20261024013421 | Deferred Hatchery membership fix; needs independent rollout review. |
| 20261025000000 | Assanti finite-stock proposal; changes existing merchant behavior. |
| 20261025030424 | Deferred Main Team activation check; needs independent rollout review. |
| 20261025031316 | Deferred atomic rescue RPC; requires coordinated backend rollout and traffic pause. |
| 20261025043221 | Deferred final daily-reward replacement; changes reward behavior and needs independent rollout review. |
| 20261026002000 | Depends on the excluded finite-stock proposal. |
| 20261026003000 | Changes merchant limits and depends on the finite-stock proposal. |
| 20261026010000 | Unrecorded legacy item-claim SQL; live column/function already exist according to the earlier schema review. Replaying ADD COLUMN would fail. No synthetic applied record was created. |
| 20261027010000 | Finite-stock basket proposal with unconfigured potion economy and coordinated rollout requirements. |
| 20261027125335 | Alternative merchant compatibility proposal; incompatible with the finite-stock drafts. |

Archiving does not implement these deferred fixes or declare them unnecessary. If needed, review against the current database and create a new forward migration with the CLI. Do not copy this directory wholesale back into the runnable queue.
