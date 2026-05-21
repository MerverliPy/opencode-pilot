# Pilot Core Rules

## Token policy

- Read only the files needed for the current phase.
- Use `context-scout` for broad discovery instead of repeatedly scanning the tree.
- Summarize findings as file paths plus exact symbols. Avoid pasting full files unless necessary.
- Use skills only when their trigger matches the task.

## Edit policy

- Normal edit ownership belongs to `implementer` or `maintainer`.
- The only edit-capable subagent by default is `minimal-change-implementer`; other specialist subagents must ask before edits and should receive narrow failure/context handoffs.
- Reviewers and scouts are read-only.
- Never run destructive commands (`rm -rf`, force push, reset hard, database deletion) without explicit user approval.
- Do not change provider/model IDs away from `n9router/*` without explicit instruction.

## Verification policy

Choose the cheapest verification that proves the change:

1. Changed shared types: `npm run typecheck -w shared`.
2. Changed server code: `npm run typecheck -w server`, then `npm run build -w server` if needed.
3. Changed UI code: `npm run typecheck -w ui`, `npm run test -w ui`, then `npm run lint -w ui` if relevant.
4. Cross-package change: root `npm run typecheck`, then root `npm run build`.
5. User journey change: targeted Playwright test before full `npm run test:e2e`.

## Security policy

- Treat Pilot as Tailscale-exposable remote admin software unless a task explicitly proves loopback-only scope.
- Tailscale is not an auth replacement: terminal, git push, tunnel, proxy, model file tools, and memory routes still require app-level auth by default.
- Dangerous features may be enabled/visible by default, but execution must be bound to authenticated sessions and use explicit confirmations for remote mutation.
- Treat Hono route params, request bodies, query strings, SSE payloads, terminal input, and browser storage as untrusted.
- Validate and normalize inputs at boundaries.
- Use parameterized SQLite queries.
- Never log credentials, bearer tokens, cookies, API keys, provider responses with secrets, or full request bodies unless explicitly required for a controlled debug task.
- Never commit API keys, tokens, or secrets in `opencode.json` or any config file. Add secrets only to local (gitignored) copies.
- Security remediation plans: see .opencode/rules/remediation.md
