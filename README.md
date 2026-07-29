# CyberAudit Skill

**Universal security audit skill for AI agents — now surgical & token-optimized.**  
One install. 22 agents. Full OWASP coverage + deterministic scanners (secrets + web + Git history) + token-saving MCP tools.

```bash
npx -y cyberaudit-skill install
```

## What It Is

CyberAudit is a structured security audit framework delivered as an AI agent skill. It covers OWASP Top 10 (web), OWASP API Top 10, OWASP MASVS (mobile), and cloud configuration — with scoring, severity ratings, and remediation guidance.

### 🛡️ Deterministic Scanners (No LLM needed):
- `scan` → 15 secret patterns (AWS, GitHub, Stripe, private keys, JWT...) with **Git history leak scanning** and `.cyberauditignore` support + 16 web vulnerability patterns (SQLi, XSS, jwt.decode, CORS, eval, Mass Assignment, NoSQLi, and now **Open Redirect, Path Traversal, XXE, and SSRF**).
- `report` → Generates a comprehensive markdown report with scoring, CVSS vector strings, OWASP compliance, and prioritize phases.
- **Differential Audits** → Pass `--baseline <file>` to automatically calculate and generate a **Differential Security Dashboard** comparing the current scan with a previous baseline (showing new, resolved, and legacy vulnerabilities).

### 🤖 High-Efficiency MCP Tools (Saves 95% Tokens):
- `cyberaudit-get-scope` → Automatically scans the project directory and identifies the highest-risk files (database queries, auth, user input, command exec, file operations) so you can focus your LLM audit on these targets, avoiding token drain on boilerplate/static files.
- `cyberaudit-get-reference` → Fetches highly condensed, token-compressed checklists and remediation templates on-demand (e.g. for SQLi, XSS, mobile storage) on request, saving 90% of your token quota.

---

## Supports 22 AI Coding Agents — Like ui-ux-pro-max-skill

| Agent | Skill Path | Commands for "/" Menu | Method |
|---|---|---|---|
| OpenCode | `~/.agents/skills/` + `~/.config/opencode/skills/` | `~/.config/opencode/commands/` (60 cmds) | Central Shared + Wrapper |
| Claude Code | `~/.claude/skills/` | `~/.claude/commands/` (8 main) | Central Shared + Wrapper |
| Cursor | `~/.cursor/skills/` | `~/.cursor/commands/` + `mcp.json` | MCP server |
| Windsurf | `~/.windsurf/skills/` | `~/.windsurf/workflows/` | Central Shared + Wrapper |
| Antigravity | `~/.agent/skills/` + `~/.gemini/antigravity/skills/` | `~/.agent/workflows/` | Central Shared + Wrapper |
| GitHub Copilot | `~/.copilot/skills/` + `~/.github/copilot/skills/` | `~/.copilot/commands/` | Central Shared + Wrapper |
| Kiro | `~/.kiro/skills/` | `~/.kiro/commands/` | Central Shared + Wrapper |
| Codex CLI | `~/.codex/skills/` | `~/.codex/commands/` | Central Shared + Wrapper |
| Qoder | `~/.qoder/skills/` | `~/.qoder/commands/` | Central Shared + Wrapper |
| Roo Code | `~/.roo/skills/` + `~/.roocode/skills/` | `~/.roo/commands/` | Central Shared + Wrapper |
| Gemini CLI | `~/.gemini/skills/` | `~/.gemini/commands/` | Central Shared + Wrapper |
| Trae | `~/.trae/skills/` | `~/.trae/commands/` | Central Shared + Wrapper |
| Continue | `~/.continue/skills/` | `~/.continue/commands/` | Central Shared + Wrapper |
| CodeBuddy | `~/.codebuddy/skills/` | `~/.codebuddy/commands/` | Central Shared + Wrapper |
| Droid (Factory) | `~/.factory/skills/` | `~/.factory/commands/` | Central Shared + Wrapper |
| KiloCode | `~/.kilocode/skills/` | `~/.kilocode/commands/` | Central Shared + Wrapper |
| Warp | `~/.warp/skills/` | `~/.warp/commands/` | Central Shared + Wrapper |
| Augment | `~/.augment/skills/` | `~/.augment/commands/` | Central Shared + Wrapper |
| CodeWhale | `~/.codewhale/skills/` | `~/.codewhale/commands/` | Central Shared + Wrapper |
| Cline | `~/.cline/skills/` | `~/.cline/commands/` | Central Shared + Wrapper |
| Aider | `~/.aider/skills/` | `~/.aider/commands/` | Central Shared + Wrapper |

---

## Quick Start

```bash
# Safe, transactional installation globally for all found agents
npx -y cyberaudit-skill install

# Project-local installation (like ui-ux-pro) — automatically configures .gitignore
npx -y cyberaudit-skill install --agent all --local

# Uninstall completely
npx -y cyberaudit-skill uninstall

# Run diagnostic and validation check
npx -y cyberaudit-skill doctor

# Update central shared installation
npx -y cyberaudit-skill update

# Programmatic deterministic scan (Secrets + Web only)
npx -y cyberaudit-skill scan ./ --type all
npx -y cyberaudit-skill scan ./ --json > current_scan.json

# Generate differential audit report
npx -y cyberaudit-skill report ./ --input current_scan.json --baseline previous_scan.json --output report.md
```

## Available Audits & Methodology

| Command / Tool | Scope | Audit Method |
|---|---|---|
| `cyberaudit-web` | OWASP Top 10 Web vulnerabilities | **Deterministic (16 patterns)** + LLM Checklist triage |
| `cyberaudit-mobile` | OWASP MASVS mobile audit | **LLM-Guided Checklist** |
| `cyberaudit-api` | OWASP API Top 10 audit | **LLM-Guided Checklist** |
| `cyberaudit-cloud` | Cloud config audit (S3, IAM, SG) | **LLM-Guided Checklist** |
| `cyberaudit-quick` | Secrets & Critical Web vulnerabilities | **Deterministic scan (Secrets + Web)** |

---

## MCP Server

CyberAudit runs as a standard MCP server for compatible agents (Cursor, Claude Desktop, Windsurf, Cline, Continue):

```bash
npx -y cyberaudit-skill serve
```

Our MCP server now automatically returns **active, token-compressed checklists** on request instead of empty notices, and includes the **Scope Analyzer** and **Reference Fetcher** tools!

## License

MIT
