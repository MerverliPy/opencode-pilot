---
description: Update existing Pilot docs or codemaps from source-of-truth files.
agent: maintainer
---

# /docs

Use `docs-updater` for `$ARGUMENTS`.

Rules:

- Update existing docs first.
- Do not create new markdown files unless requested.
- Use package scripts, source imports, and the `/setup-n9router` command as source of truth.
- Produce a compact diff summary.
