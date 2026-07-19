# CyberAudit Skill

**Universal security audit skill for AI agents.**  
One install. Any AI agent. Full OWASP coverage.

```bash
npx -y cyberaudit-skill install
```

## What It Is

CyberAudit is a structured security audit framework delivered as an AI agent skill. It covers OWASP Top 10 (web), OWASP MASVS (mobile), API security, and cloud config — with scoring, severity ratings, and remediation guidance.

Supports every major AI coding agent:

| Agent | Detection | Method |
|---|---|---|
| OpenCode | `~/.agents/skills/` | File copy |
| Claude Code | `~/.claude/skills/` | File copy |
| Cursor | `.cursor/mcp.json` | MCP server |
| Kiro | `~/.kiro/skills/` | File copy |
| Gemini | `~/.gemini/skills/` | File copy |

## Quick Start

```bash
# Auto-detect & install for all found agents
npx -y cyberaudit-skill install

# Install for a specific agent
npx -y cyberaudit-skill install --agent opencode

# Preview without making changes
npx -y cyberaudit-skill install --dry-run
```

## Available Audits

| Command | Scope |
|---|---|
| `cyberaudit-web` | OWASP Top 10 web app audit |
| `cyberaudit-mobile` | OWASP MASVS mobile audit |
| `cyberaudit-api` | API security audit |
| `cyberaudit-cloud` | Cloud config audit |
| `cyberaudit-full` | Full stack (web + API + cloud) |
| `cyberaudit-quick` | 5-minute vulnerability scan |

### Usage

Once installed, load the skill in your AI agent:

```
/load-skill cyberaudit
/cyberaudit-web example.com
```

## MCP Server

CyberAudit runs as a stdio MCP server for MCP-compatible agents (Cursor, etc.):

```bash
npx -y cyberaudit-skill serve
```

## Verify Installation

```bash
npx -y cyberaudit-skill list
```

## Repository

https://github.com/ArisRoman/cyberaudit-skill

## License

MIT
