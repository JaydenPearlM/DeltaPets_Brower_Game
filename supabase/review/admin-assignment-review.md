# Administrator assignment — review only

Project: Deltapets (`uhdpwgybrcizligqypzb`). Inspected 2026-11-06.
Target: `d75a5ab0-0763-4548-87bb-cc9f5483b94f`, `jaydentestemail6790+admin@gmail.com`.
No database writes, promotion, reset, session changes, or deployment performed.

## Observed findings

- Live auth.users and public.profiles both match the UUID and lowercase email. Profile currently has is_admin=false and role=user. Zero profile administrators and zero auth app_metadata role=admin/is_admin=true markers were found. Nine other profiles exist; their UUID/role/is_admin digest is captured in both SQL files.
- Auth role remains authenticated; email is confirmed, email identity exists, banned_until and deleted_at are null. These are sign-in prerequisites, not a successful login test. Passwords and sessions were not inspected or changed.
- The live prevent_role_escalation function unconditionally rejects changing either profile role field. The trigger is enabled for normal operation (O). A service-role RLS bypass does not bypass this trigger.
- Live announcements policy "admins manage announcements" checks profiles.is_admin against auth.uid(). This is a real database authorization effect. The inspected Express requireUser middleware verifies tokens with auth.getUser; /api/me returns is_admin but does not confer general administrative powers. No generic admin middleware was found. The proposal does not grant database roles, project access, service-role keys, or new backend permissions.
- Active baseline migration contains historical role-dependent functions; live catalog inspection takes precedence: current public functions referencing is_admin/admin comprise the escalation guard, with no matching public views. Existing role constraint permits user/admin.

## Proposed privileged method and risks

Use the project's SQL Editor as postgres, or a trusted direct postgres connection to this exact project, only after separate explicit approval. Verify the selected project manually; SQL cannot establish the dashboard project ref. Execute the complete admin-promotion.sql file in one session. It is deliberately outside migrations and ends with ROLLBACK. Approval must include replacing that last statement with COMMIT for a permanent assignment. Even a rollback dry run performs temporary writes and is NOT authorized yet.

The ACCESS EXCLUSIVE profile lock prevents concurrent profile reads/writes while exactly one named trigger is temporarily disabled. This briefly blocks profile-dependent requests; lock timeout is 5 seconds, statement timeout 30 seconds, idle transaction timeout 60 seconds. No interactive pause should occur while holding locks. Only the table owner/privileged maintenance operator can perform this operation. Ordinary API clients cannot use it. No callable function is installed, no RLS is changed, and replication-role bypass is not used. PostgreSQL documents owner requirements and trigger toggles at https://www.postgresql.org/docs/current/sql-altertable.html.

Identity, zero existing admins, other-role baseline, original trigger/function hashes, normal trigger mode, and target sign-in prerequisites must all pass before mutation. Concurrent privileged maintenance must be excluded operationally. The target auth row is locked; the script does not write auth data. Existing updated_at triggers will update the target profile timestamp. Every other target field and every other profile is compared after the update. Exactly one administrator and restored trigger are required before completion. Errors abort the transaction; ROLLBACK (or closing the connection) restores both flags and transactional trigger state. Do not bypass a failed guard or run selected statements. Reinspect if any reviewed state changes.

## Closed Alpha reset — unresolved blocker

No planned Closed Alpha progress-reset SQL was found in the repository's SQL/Markdown searches. The existing reset_test_account_game_data function and development-only self-destruct route are test-account deletion tools, not the requested alpha reset. Neither constitutes explicit UUID-based protection for the future reset. They were not changed or executed.

The future reset MUST explicitly exclude UUID d75a5ab0-0763-4548-87bb-cc9f5483b94f independently of admin flags. Build one reviewed reset-target set excluding that UUID and every designated admin, then scope EVERY deletion/update to that set. Derive pet IDs, battle/run IDs and other indirect child ownership from those targets before deleting any parents. Inspect cascades, triggers, dynamic SQL and cleanup RPCs; no blanket TRUNCATE or global cleanup may affect protected rows. Add a preflight assertion that the protected UUID is absent from all target sets and before/after assertions preserving its entire player-data graph. Do not delete auth identities. The actual reset script and its affected table graph must be supplied/reviewed before exclusion can be certified. No reset SQL is included here to avoid implying an unaudited deletion plan is safe.

## Verification and limitations

admin-verification.sql is read-only. Before promotion, administrator counts should be 0/0; after approved promotion, 1/1. Other-role digest must match, trigger/function hashes must match, trigger mode must remain O, and auth eligibility checks must remain true. Metadata admin count should remain zero; application profile admin and Supabase Auth role are distinct.

Live SELECTs confirmed the pre-promotion findings and trigger definition. Promotion SQL was reviewed against the live schema but was NOT executed, including with rollback. No attempted escalation, login, announcement write, player reset or gameplay test was performed. SQL-only review files do not require frontend/backend builds. Read-only catalog checks confirm enabled protection and unchanged implementation; they do not behaviorally test a rejected update. The supplied source confirms rejection of both fields.

## Change inventory

Only new review artifacts were added. No existing source, migrations or player records were replaced. The accompanying admin-code-changes.md records exact complete additions with line 1, old_code absent, and full new_code. git-status-before.txt records the existing working tree on branch Core_Systems_version_1; staged changes were absent. All pre-existing work is preserved.
