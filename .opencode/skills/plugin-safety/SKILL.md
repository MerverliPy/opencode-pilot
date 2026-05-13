---

name: plugin-safety
description: "Use when editing OpenCode plugin TypeScript, tool guardrails, compaction/compression behavior, or workflow hooks."
compatibility: opencode
---

# OpenCode plugin safety

## Design constraints

- Plugins must be low-noise and fail soft unless blocking a dangerous action.
- Do not run expensive checks after every edit.
- Do not auto-format or auto-edit without explicit workflow ownership.
- Keep hook output concise; noisy hooks waste context.
- Guardrails should block destructive commands and suspicious docs sprawl, not normal implementation.

## Safe hook behavior

- Before bash: block obvious destructive git/filesystem commands unless explicitly approved.
- After large tool output: compress summaries when possible.
- On n9router workflow: remind only when model/config changes appear to bypass `n9router/*`.

## Verification

- Typecheck plugin files with the project/plugin tsconfig if available.
- Add lightweight tests only for deterministic utility behavior.
- Avoid network calls in plugins.
