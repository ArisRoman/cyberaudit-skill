# CyberAudit - Claude Code Instructions

## Build & Test Commands
- Build project: `npm run build`
- Run test suite: `npm test`
- Standard check: `vitest run`
- CLI Dev: `tsx src/cli.ts`

## 🛡️ CyberAudit - Ultra-Efficient Audit Guidelines (Tokens & Performance)

To avoid token drain, high costs, and latency, Claude Code MUST follow this surgical hybrid SAST workflow instead of reading entire directories.

### 1. Identify Sensitive Files (Saves 95% Tokens)
DO NOT read or grep every file. Instead, call the MCP tool `cyberaudit-get-scope`:
```bash
# Via MCP tool call:
cyberaudit-get-scope --target "."
```
Focus your audit ONLY on the ranked files returned by this tool.

### 2. Run Deterministic Scan
Run the fast deterministic scan on the selected target:
```bash
# Via MCP tool call:
cyberaudit-quick --target "."
```

### 3. Fetch Targeted Checklists On-Demand (Saves 90% Tokens)
DO NOT read raw files like `web/WEB-CHECKLIST.md` or `web/WEB-REMEDIATION-LIBRARY.md` from the skills folder.
Instead, use the selective reference fetcher MCP tool to load only what you need:
```bash
# To get SQLi guidelines:
cyberaudit-get-reference --topic "web-sqli"

# To get XSS guidelines:
cyberaudit-get-reference --topic "web-xss"
```

### 4. Generate Differential Reports
When generating reports, always look for a previous scan file (`findings.json`) and run a differential audit to show new, fixed, and legacy vulnerabilities:
```bash
npx cyberaudit-skill report . --input current_scan.json --baseline previous_scan.json --output report.md
```
This avoids wasting context re-analyzing already triaged or resolved findings.
