---
name: deltapets-repo-audit
description: Manual audit for the DeltaPets repo. Use this when asked to inspect DeltaPets for typos, duplicate code, legacy code, dead imports, stale files, portability issues, backup issues, .gitignore issues, TypeScript health, CSS risks, and safe surgical cleanup order. This skill must report only unless the user explicitly asks for one surgical patch.
---

# DeltaPets Repo Audit Skill

You are auditing the DeltaPets repo.

## Hard rule

Do not modify files unless the user explicitly asks for a specific surgical patch.

Audit first. Report only.

## Project context

DeltaPets is a React + TypeScript + Vite frontend, Node/Express + TypeScript backend, pnpm monorepo, and Supabase database project.

The goal is to keep the project stable, portable, easy to copy, easy to back up, and safe for alpha testing.

## Main audit goals

Check for:

1. Typos in filenames, comments, labels, strings, docs, CSS class names, and obvious UI text.
2. Duplicate files, duplicate CSS, duplicate components, duplicate logic, or old legacy code.
3. Dead imports, unused files, old references, broken imports, and stale components.
4. Code or folders that make the project harder to copy, move, restore, or deploy.
5. Folders that should not be copied into backup folders:
   - node_modules
   - .git
   - dist
   - build
   - .vite
   - coverage
   - .turbo
   - .next
   - cache folders
   - logs
   - temporary files
6. Package scripts that prove whether the project is healthy.
7. Missing .gitignore entries.
8. Possible .env or secret exposure risks.
9. TypeScript health, any usage, ts-ignore usage, and broken paths.
10. CSS health, but without redesigning the UI.

## Locked DeltaPets CSS rule

The blue grid texture system is locked.

Do not delete, rename, replace, simplify, redesign, or “clean up” these unless there is a confirmed direct bug and the user explicitly approves touching them:

- --dp-popup-grid-line
- --dp-popup-grid-size
- --dp-popup-blue-grid
- .dp-blue-grid-panel
- .dp-blue-grid-panel::after
- .dp-blue-grid-panel > \*

The grid system is fragile. If it works, freeze it. Everything else adapts around it.

## Audit order

Inspect the project in this order:

1. Repo root:
   - package.json
   - pnpm-workspace.yaml
   - pnpm-lock.yaml
   - .gitignore
   - README files
   - env examples

2. frontend/web:
   - package.json
   - src/global.css
   - src/pages
   - src/components
   - CSS files

3. backend/server:
   - package.json
   - src/routes
   - src/lib
   - src/middleware

4. supabase:
   - migrations
   - SQL files

5. scripts, docs, deployment config, and backup-related files.

## Commands allowed for audit only

You may run read-only or verification commands such as:

```bash
git status
git ls-files
pnpm -v
pnpm install --frozen-lockfile
pnpm build
pnpm lint
pnpm typecheck
pnpm test
rg "TODO|FIXME|legacy|old|backup|copy|deprecated|PetSkillsPanel|console.log|debugger|@ts-ignore|eslint-disable|any"
rg "dp-blue-grid-panel|--dp-popup-blue-grid|--dp-popup-grid-line|--dp-popup-grid-size"
rg "from ['\"].*PetSkillsPanel|from ['\"].*ProgressCard|from ['\"].*skillChamber"
```
