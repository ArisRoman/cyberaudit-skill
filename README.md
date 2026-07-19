# CyberAudit Skill

**Universal security audit skill for AI agents — now deterministic.**  
One install. 22 agents. Full OWASP coverage + deterministic scanners (secrets + web).

```bash
npx -y cyberaudit-skill install
```

## What It Is

CyberAudit is a structured security audit framework delivered as an AI agent skill. It covers OWASP Top 10 (web), OWASP MASVS (mobile), API security, and cloud config — with scoring, severity ratings, and remediation guidance.

**Deterministic scanners (no LLM needed):**
- `scan` → 15 secret patterns (AWS, GitHub PAT, Stripe, private keys, JWT, DB URLs...) + 12 web vuln patterns (SQLi concat, XSS dangerouslySetInnerHTML, jwt.decode, CORS *, eval, mass assignment, NoSQLi)
- `report` → auto-generates markdown report with score, verdict, OWASP compliance, remediation plan

**Supports 22 AI coding agents — like ui-ux-pro-max-skill:**

| Agent | Skill Path | Commands for "/" Menu | Method |
|---|---|---|---|
| OpenCode | `~/.agents/skills/` + `~/.config/opencode/skills/` | `~/.config/opencode/commands/` (60 cmds) | File copy |
| Claude Code | `~/.claude/skills/` | `~/.claude/commands/` (8 main) | File copy |
| Cursor | `~/.cursor/skills/` | `~/.cursor/commands/` + `mcp.json` | MCP server |
| Windsurf | `~/.windsurf/skills/` | `~/.windsurf/workflows/` | File copy |
| Antigravity | `~/.agent/skills/` + `~/.gemini/antigravity/skills/` | `~/.agent/workflows/` | File copy |
| GitHub Copilot | `~/.copilot/skills/` + `~/.github/copilot/skills/` | `~/.copilot/commands/` | File copy |
| Kiro | `~/.kiro/skills/` | `~/.kiro/commands/` | File copy |
| Codex CLI | `~/.codex/skills/` | `~/.codex/commands/` | File copy |
| Qoder | `~/.qoder/skills/` | `~/.qoder/commands/` | File copy |
| Roo Code | `~/.roo/skills/` + `~/.roocode/skills/` | `~/.roo/commands/` | File copy |
| Gemini CLI | `~/.gemini/skills/` | `~/.gemini/commands/` | File copy |
| Trae | `~/.trae/skills/` | `~/.trae/commands/` | File copy |
| Continue | `~/.continue/skills/` | `~/.continue/commands/` | File copy |
| CodeBuddy | `~/.codebuddy/skills/` | `~/.codebuddy/commands/` | File copy |
| Droid (Factory) | `~/.factory/skills/` | `~/.factory/commands/` | File copy |
| KiloCode | `~/.kilocode/skills/` | `~/.kilocode/commands/` | File copy |
| Warp | `~/.warp/skills/` | `~/.warp/commands/` | File copy |
| Augment | `~/.augment/skills/` | `~/.augment/commands/` | File copy |
| CodeWhale | `~/.codewhale/skills/` | `~/.codewhale/commands/` | File copy |
| Cline | `~/.cline/skills/` | `~/.cline/commands/` | File copy |
| Aider | `~/.aider/skills/` | `~/.aider/commands/` | File copy |

**8 main slash commands shown when typing "/"** (like ui-ux-pro):
`/audit`, `/audit:web`, `/audit:mobile`, `/audit:api`, `/audit:cloud`, `/audit:quick`, `/audit:report`, `/audit:help`
+ 52 additional commands (total 60) for full coverage.

## Quick Start

```bash
# Auto-detect & install for all found agents (22 agents checked)
npx -y cyberaudit-skill install

# Install for a specific agent
npx -y cyberaudit-skill install --agent claude-code
npx -y cyberaudit-skill install --agent cursor
npx -y cyberaudit-skill install --agent windsurf

# Preview without making changes
npx -y cyberaudit-skill install --dry-run

# Deterministic scan (no LLM)
npx -y cyberaudit-skill scan ./ --type all
npx -y cyberaudit-skill scan ./ --json > findings.json
npx -y cyberaudit-skill report ./ --input findings.json --type web --output report.md
```

## Available Audits

| Command | Scope | Deterministic? |
|---|---|---|
| `cyberaudit-web` | OWASP Top 10 web app audit | Yes (12 patterns) |
| `cyberaudit-mobile` | OWASP MASVS mobile audit | Via checklist |
| `cyberaudit-api` | API security audit | Via checklist |
| `cyberaudit-cloud` | Cloud config audit (S3, IAM, SG) | Via checklist |
| `cyberaudit-full` | Full stack (web + API + cloud) | Partial |
| `cyberaudit-quick` | 5-minute scan (secrets + web) | **Yes, fully deterministic** |

### Usage (once installed)

In your AI agent, type "/" — you should see 8 main commands:

```
/audit
/audit:web
/audit:mobile
/audit:api
/audit:cloud
/audit:quick
/audit:report
/audit:help
```

Or classic:

```
/load-skill cyberaudit
/cyberaudit-web example.com
```

## MCP Server

CyberAudit runs as a stdio MCP server for MCP-compatible agents (Cursor, Claude Desktop, Windsurf, etc.):

```bash
npx -y cyberaudit-skill serve
```

`cyberaudit-quick` now runs deterministic scanners (secrets + web) even via MCP.

## Verify Installation

```bash
npx -y cyberaudit-skill list
# Shows 22 agents + main "/" commands
```

## Deterministic vs LLM

- **Deterministic (P2):** 15 secret patterns + 12 web patterns + auto report (score, OWASP, remediation plan) — 40 tests, 0 hallucinations
- **LLM-based:** Checklists, philosophies, threat models, 60 commands for context-aware audit

## Repository

https://github.com/ArisRoman/cyberaudit-skill

## License

MIT
