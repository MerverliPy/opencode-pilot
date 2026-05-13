---

name: codemap-maintenance
description: "Use for lean documentation and codemap maintenance from source-of-truth files without creating documentation sprawl."
compatibility: opencode
---

# Codemap maintenance

## Source of truth

- Scripts: root and workspace `package.json` files.
- Architecture: actual imports/exports and folder structure under `server/src`, `ui/src`, `shared/src`, `e2e/tests`.
- n9router: `opencode.json` and the `/setup-n9router` command.

## Rules

- Update existing docs first.
- Create new docs only when explicitly requested.
- Keep codemaps compact: package, responsibility, key files, data flow, verification commands.
- Include freshness date only when the file already uses freshness metadata.

## Output shape

```text
Docs updated:
- path — reason
Source facts used:
- path or script
Stale docs found:
- path — why possibly stale
```
