# Audit Bundle Hygiene

Use this checklist before exporting a repository or workflow bundle for external review.

## Exclude from bundles

- `opencode.json` local runtime config
- `.env`, `.env.*`, `.npmrc`, `.pypirc`, private keys, PEM files
- `*.db`, `*.db-shm`, `*.db-wal`
- `node_modules/`, `dist/`, `coverage/`, test reports, browser traces
- provider API keys, bearer tokens, cookies, auth headers, local URLs that expose private network details

## Include instead

- `opencode.json.example`
- `.opencode/agents/`
- `.opencode/commands/`
- `.opencode/skills/`
- `.opencode/plugins/`
- `.opencode/tools/`
- `AGENTS.md`
- generated inventory: `.opencode/inventory.json` and `docs/opencode-inventory.md`

## Validation before sharing

```bash
npm run check:opencode-inventory
grep -RInE '"apiKey"\s*:|"Authorization"\s*:|"Bearer [A-Za-z0-9._-]+'   --exclude-dir=node_modules --exclude-dir=.git .
```

If a real secret was ever included in a shared bundle, rotate it outside the repository. Removing it from the bundle is not enough.
