# OpenCode Workflow Fix Report

Generated: 2026-05-20

## Completed fixes

1. Removed local `opencode.json` from the fixed bundle.
   - `opencode.json.example` is now the committed/shared config template.
   - Literal provider API keys were removed from the fixed bundle.
   - Provider base URL defaults to `http://localhost:20128/v1`.

2. Removed local plugin double-load risk.
   - `opencode.json.example` now uses `"plugin": []`.
   - Project-local plugins remain in `.opencode/plugins/` for OpenCode auto-loading.

3. Gated MCP by default.
   - All configured MCP servers now use `"enabled": false`.
   - GitHub uses an environment placeholder instead of a literal token.

4. Hardened permissions.
   - `.env` and `.env.*` reads are explicitly denied while `.env.example` remains allowed.
   - Skill access is now pattern-scoped with most skills set to `ask`.
   - Destructive bash examples are explicitly denied.

5. Normalized task source-of-truth.
   - `TASKS.md` is canonical.
   - `.opencode/plans/next-task.json` is a generated pointer derived from `TASKS.md`.
   - Legacy deep-audit files are marked reference-only.

6. Fixed mechanism confusion.
   - `plugin-safety` is treated as a skill, not a subagent, in orchestrator routing.

7. Reduced edit-capable subagent risk.
   - `build-fixer`, `docs-updater`, and `e2e-runner` now ask before edits/writes.
   - `minimal-change-implementer` remains the default edit-capable subagent.
   - `implementer` and `maintainer` remain primary edit owners.

8. Added generated inventory governance.
   - New script: `scripts/check-opencode-inventory.mjs`
   - New scripts: `npm run check:opencode-inventory`, `npm run write:opencode-inventory`
   - Generated files: `.opencode/inventory.json`, `docs/opencode-inventory.md`

9. Removed bundle hygiene risks.
   - Removed SQLite DB artifacts from the fixed bundle.
   - Added `docs/audit-bundle-hygiene.md`.

## Validation run

- `npm run check:opencode-inventory` passed.
- JSON parse checks passed for `opencode.json.example`, `package.json`, `.opencode/plans/next-task.json`, and `.opencode/inventory.json`.
- Secret regex scan found no literal `n9r_...` API key and no literal `"apiKey": "<secret>"`.
- DB artifact scan found no `*.db`, `*.db-shm`, or `*.db-wal` files.
- `npm run check:opencode` could not complete in this sandbox because Node type definitions are not installed in the extracted bundle (`TS2688: Cannot find type definition file for 'node'`). Run `npm install` first in your local repo, then rerun.

## Manual step still required

If the exposed provider key was ever valid, rotate/revoke it in the provider system. Removing it from the bundle does not invalidate the credential.
