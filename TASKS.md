# Pilot — Task Agenda

## Agent Workflow Instructions

> **Before any work, read this file.**
>
> This file is the single source of truth for what to work on next. Follow this order:
>
> 1. Read this file to find the active (non-completed) task.
> 2. Execute the task in its own atomic scope.
> 3. Validate: run lint/typecheck/tests as specified.
> 4. Present the diff to the user and ask: "Commit and push now?"
> 5. After user confirms commit/push: update this file — mark the task `[x]`, append a "Completed" entry with date + description + files changed.
> 6. The file now naturally points to the next active task — repeat from step 1.
>
> Never start a task without reading this file. Never leave this file stale after a commit.

---

## Recently Completed

| Date       | Task                      | Files Changed                                         | Notes                                                                                            |
| ---------- | ------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| 2026-05-09 | Consolidate ROADMAP files | `ROADMAP.md` (rewrite), `FEATURE-ROADMAP.md` (delete) | Merged Phase 1-6 tables into single roadmap. Reduced from 430 → 368 lines.                       |
| 2026-05-09 | Fix README stale refs     | No changes needed                                     | Phase 1 audit already fixed syntax.ts + plugin/ references.                                      |
| 2026-05-09 | Fix DESIGN.md SDK claim   | No changes needed                                     | Phase 1 audit already replaced false SDK claim with "Custom REST client built on plain fetch()". |
| 2026-05-09 | Update AGENTS.md          | `AGENTS.md`                                           | Added "Agent Workflow" section referencing TASKS.md; updated Pilot doc link.                     |

---

## Task Queue

### Task 1: Consolidate ROADMAP files into single ROADMAP.md

- **Status:** `[x]`
- **Done by:** Subagent fixer (ses_1f13effadffeA16QleVLFVi8VK)
- **Files:** `ROADMAP.md` (rewrite from 271 lines), `FEATURE-ROADMAP.md` (delete)

### Task 2: Fix README.md stale references (theme dir)

- **Status:** `[x]`
- **Notes:** Phase 1 audit already resolved (2026-05-08). No action needed.

### Task 3: Fix DESIGN.md remaining stale paths

- **Status:** `[x]`
- **Notes:** Phase 1 audit already resolved (2026-05-08). No action needed.

### Task 4: Update AGENTS.md to reference TASKS.md

- **Status:** `[x]`
- **Done by:** Subagent fixer (ses_1f13e96a1ffeqIsGPyj6onhsK0)

### Task 5: Fix AGENTS.md skill count from "30+" to exact number

- **Status:** `[x]`
- **Notes:** AGENTS.md already uses "29 skills" prose. No action needed.

### Task 6: Fix README.md to include plugin/ directory

- **Status:** `[x]`
- **Notes:** Phase 1 audit already added plugin/memory/ to project structure (2026-05-08). No action needed.

### Task 7: Commit and push the doc consolidation

- **Status:** `[ ]` (waiting for user confirmation)
