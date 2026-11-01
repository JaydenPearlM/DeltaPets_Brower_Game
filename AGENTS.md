# DeltaPets — Codex Working Agreement

## Mission

Deliver the requested working code change, not just an investigation or plan. Prefer the smallest complete, maintainable fix. Continue through implementation and verification unless genuinely blocked.

## Repository context

- pnpm monorepo; React/TypeScript/Vite frontend and Express/TypeScript backend.
- Preserve established gameplay, merchant UI/art, player data, and desktop/mobile behavior.
- Respect the current branch; do not switch branches or merge unless asked.

## Investigation and credit efficiency

1. Begin with the user's reported symptom, relevant errors, and likely entry points.
2. Search filenames/symbols in the affected area first (e.g. `rg -n` with scoped paths); follow imports, API routes, auth, shared utilities, and data sources as needed.
3. Widen scope when evidence requires it. Never sacrifice correctness to minimize tool calls.
4. Read files once where practical; avoid repeating broad scans, builds, or unrelated investigations.
5. Distinguish observed facts from hypotheses. Check actual error paths before changing behavior.

## Autonomy and approvals

- Make ordinary reversible source-code edits without asking: imports, types, request/response handling, error handling, tests, and small compatible refactors directly necessary for the task.
- Use existing patterns and reasonable defaults. If several safe options exist, choose the simplest and explain briefly afterward.
- Ask before destructive or irreversible operations, production deploys, database resets/deletes, schema migrations, changing access controls/secrets, purchases, or broad feature redesigns.
- Do not change or reveal credentials. Never run destructive DB commands to test a fix.
- If a necessary approval is missing, complete all safe work first, then ask one precise question identifying the blocked step.

## Completion contract

1. Reproduce or trace the failure where feasible.
2. Implement the smallest complete fix in actual files.
3. Add or update focused regression tests where feasible.
4. Run relevant targeted checks (tests, lint/typecheck/build as appropriate); fix errors caused by the change.
5. Inspect the diff for unrelated edits and regressions.
6. Report: root cause (confirmed or uncertain), files changed, checks and outcomes, and any remaining blockers.

- Do not declare success if checks failed or could not run. Do not stop after describing a proposed patch when the files are editable.
- Do not fabricate code changes, test results, or Trello status.

## DeltaPets merchant-specific guardrails

- Preserve Assanti's layout, artwork, dialogue, item definitions, prices, effects, and trading rules unless the task explicitly changes them.
- Investigate shop stock and player inventory failures independently and look for shared causes (auth/session, API base URL, backend availability, response contracts, DB/RLS, data parsing).
- Never silently replace a failed network response with empty stock/inventory or pretend a trade succeeded.
- Verify food and potion loading, player inventory, buy/sell, buyback if supported, and trade totals when touched.
- Keep player-facing errors useful without exposing internal or secret details.

## EXISTING FEATURE PROTECTION — PRESERVE BEFORE MODIFYING

DeltaPets is an existing game with established systems. When the user requests a tweak, adjustment, polish, or small correction, treat the existing implementation as the source of truth.

### 1. Preserve working architecture

- Do not replace an existing implementation with a new architecture.
- Do not replace JSON-based item definitions with database-managed definitions unless explicitly requested.
- Preserve existing data-loading paths, APIs, database functions, and trading behavior unless the requested change requires modifying them.
- Do not introduce new database dependencies to solve unrelated problems.
- Do not change existing data ownership or sources of truth without explicit approval.

### 2. Small changes mean small changes

When the user requests a tweak:

1. Identify the exact requested behavior.
2. Inspect the current implementation.
3. Determine the smallest necessary change.
4. Modify only directly relevant code.
5. Verify that existing functionality still works.

Do not interpret a small adjustment as permission to rebuild the feature.

### 3. Preserve existing functionality

Before editing an existing feature, identify its important working behaviors.

For merchants, these include:

- JSON item definitions.
- Merchant stock loading.
- Player inventory.
- Buying and selling.
- Buyback, where supported.
- Currency balances.
- Item prices and effects.
- Existing UI and artwork.

After editing, verify the relevant existing behaviors still work.

A successful TypeScript build does not prove gameplay functionality works.

### 4. Architecture changes require approval

Stop and ask before:

- Replacing JSON data sources.
- Replacing existing API contracts.
- Introducing new database tables or functions.
- Changing how inventory is stored.
- Rewriting trading logic.
- Replacing an existing working feature with a new implementation.

This restriction applies even when the proposed replacement appears cleaner or more maintainable.

### 5. Regression handling

If a change breaks previously working functionality:

1. Stop adding features.
2. Identify the regression.
3. Compare against the last known working implementation.
4. Restore the original behavior using the smallest safe correction.
5. Reapply only the requested change.
6. Verify the affected functionality.

Never conceal a regression behind fallback data, disabled controls, or success messages.

### 6. Completion requirements

For existing-feature adjustments, success means:

- The requested change works.
- Previously working functionality remains intact.
- Existing data sources and gameplay rules are preserved.
- Relevant verification passes.

If verification is unavailable, clearly report what remains untested.

Never describe a feature as repaired solely because the application builds.

Runtime errors take priority over speculative architectural changes. When logs are available, inspect the exact failing request, function, and error code before proposing a redesign, migration, or replacement implementation.
