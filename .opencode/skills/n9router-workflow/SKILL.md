---

name: n9router-workflow
description: "Use for n9router-centered OpenCode workflow, model routing, setup checks, provider/combo assumptions, and preserving n9router as the agent director."
compatibility: opencode
---

# n9router workflow

## Principles

- Keep OpenCode model IDs on the `n9router/*` provider path unless explicitly asked to change providers.
- Use n9router as the routing layer for primary and subagent models.
- Use higher-capability routed models for orchestration, planning, implementation, architecture, and security.
- Use cheaper routed models for discovery, docs updates, and mechanical verification where adequate.

## Setup checks

Before changing routing, inspect:

- `opencode.json`
- `/setup-n9router` command output
- dashboard/API setup notes in the repo

Useful local checks when n9router is running:

```bash
curl http://localhost:20128/v1/models
curl http://localhost:20128/api/models
```

Do not embed provider credentials or dashboard passwords in config files.

## Agent routing policy

- Primary orchestration: `orchestrator`.
- Trusted edits: `implementer`, `maintainer`, `build-fixer`, `e2e-runner`, `docs-updater`.
- Read-only review/discovery: scouts, reviewers, auditors.
- High-risk MCPs remain disabled by default and are enabled only for the workflow that needs them.
