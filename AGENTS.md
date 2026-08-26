# DeltaPets Repository Guidelines

## Working approach

- Use `pnpm` only. Do not switch package managers or regenerate `package-lock.json`.
- Make precise, surgical changes limited to the requested task.
- Do not perform unrelated refactors, cleanup, renaming, reformatting, or configuration changes.
- Inspect the existing implementation and run `git status` before changing files. Preserve unrelated user work.
- Reuse existing components, utilities, styles, tokens, and project conventions where practical.

## Frontend safety

- For mobile-only requests, protect desktop behavior and styling. If Jayden says “desktop is correct,” treat desktop as locked and keep the fix within mobile-specific rules, preferably `frontend/web/src/mobile.css`.
- Protect the locked blue-grid system. Do not delete, rename, redesign, or alter its core variables, selectors, borders, layout, glow, spacing, or visual language unless Jayden explicitly requests it.
- Do not add or change CORS middleware, headers, origins, or workarounds unless explicitly requested. DeltaPets uses a same-origin production architecture.

## Game and database safety

- Do not silently change game balance, stats, rarity, timers, encounters, currencies, prices, rewards, economy, item effects, progression, terminology, lore, species, elements, or location rules. Report conflicts and obtain direction first.
- Do not create, edit, reorder, delete, squash, or run Supabase migrations, and do not change or reset database state or schema, without explicit approval.
- Preserve authentication, authorization, validation, rate limiting, and security behavior.

## Git safety

- Do not commit, push, merge, rebase, reset, force-push, switch branches, or delete branches unless explicitly requested.

## Verification

- After frontend changes, run `pnpm --dir frontend/web build` when practical.
- After backend changes, run `pnpm --dir backend/server build` when practical.
- For changes affecting both applications, run `pnpm build` when practical.
- Do not invent test or lint commands that are not defined by the repository.
- Never claim a change is verified unless the stated build or check actually ran successfully. Report skipped checks and real failures clearly.
