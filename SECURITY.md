# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 3.1.x   | ✅ Yes |
| < 3.0   | ❌ No |

## Reporting a Vulnerability

**Do NOT open a public issue for security bugs.**

Please email: romanaris1@outlook.fr with:
- Description of vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix if any

We aim to respond within 48h and patch within 7 days for critical issues.

## Security of the Skill Itself

CyberAudit is a security auditing skill. Its installer performs destructive operations (rm -rf) only on safe paths:

- Allowed: `$HOME/**cyberaudit**`
- Blocked: any path outside HOME or not containing "cyberaudit"
- Cursor `mcp.json` is backed up before modification

The MCP server does not execute arbitrary code, only returns guidance to load markdown checklists.

## Supply Chain

- Dependencies: `commander` only
- Dev: `typescript`, `vitest`, `tsx`, `@types/node`
- CI runs `npm audit --audit-level=high` on every PR
- `package-lock.json` is committed and verified via `npm ci`

## Hardening Checklist for Self-Audit

- [x] No secrets in code
- [x] No `exec` with user input
- [x] Path traversal blocked via `isSafePath`
- [x] JSON parse wrapped in try/catch with backup
- [x] Version single source of truth (package.json)
