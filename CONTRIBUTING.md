# Contributing to CyberAudit Skill

## Development Setup

```bash
git clone https://github.com/ArisRoman/cyberaudit-skill
cd cyberaudit-skill
npm install
npm run build
npm test
```

## Project Structure

- `src/cli.ts` — Installer CLI (safe rm, backup mcp.json)
- `src/mcp-server.ts` — MCP server (single source of truth, version from package.json)
- `skills/cyberaudit/` — Markdown intelligence (checklists, philosophies, remediation)
  - `web/` — OWASP Top 10 web
  - `mobile/` — MASVS mobile
  - `api/` — API Top 10
  - `cloud/` — CIS / S3 / IAM / SG
  - `commands/` — One file per `/audit:*` command (60 files)
  - `reports/` — Report templates
  - `shared/` — CVSS, OWASP mapper, compliance

## Adding a New Command

1. Add entry to `skills/cyberaudit/COMMANDS.md`
2. Add entry to `skills/cyberaudit/SKILL.md` Available Commands table
3. Create `skills/cyberaudit/commands/audit-<name>.md`:
```md
---
description: What this audit does
---
Run X audit.
1. Load Y.md
2. Execute...
```
4. Run tests: `npm test`
5. Ensure tarball includes file: `npm pack --dry-run | grep audit-<name>`

## Adding a New Framework

- Create `skills/cyberaudit/web/frameworks/NEW.md` following `LARAVEL.md` structure (threat model, vulnerable patterns with DETECT/FIX)
- Add command in `COMMANDS.md`
- Update `SKILL.md` directory structure

## Versioning

- Version is defined ONLY in `package.json`
- `src/cli.ts` and `src/mcp-server.ts` read from `package.json` at runtime
- `smithery.yaml` must match `package.json` version before release
- Update `AGENT-BOOT.md` and `INSTALL.md` version footers (optional but recommended)

## Testing

```bash
npm run build
npm test          # vitest run
npm run test:watch
```

CI checks:
- build succeeds + `dist/cli.js` and `dist/mcp-server.js` exist
- version consistency (package.json vs MCP server)
- tarball contains cloud module + >=50 commands
- `npm audit --audit-level=high`

## Commit Convention

- `fix:` — bugfix P0/P1
- `feat:` — new audit module
- `docs:` — markdown improvements
- `chore:` — version bump, deps

## Release

```bash
npm version patch # or minor/major
npm run build
npm test
npm pack --dry-run | tail -20
git push origin main --tags
npm publish
```

## Code Style

- TypeScript strict, ES2022, NodeNext
- No `any` where avoidable (allowed in MCP JSON handling)
- Safe path checks for any rm -rf
- Always backup user files before overwrite
