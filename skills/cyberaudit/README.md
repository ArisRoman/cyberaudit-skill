# CyberAudit Skill

Security audit intelligence for AI agents. Pure Markdown, zero dependencies.

## Coverage

| Domain | Detail |
|---|---|
| **Web** | 7 frameworks (React, Next.js, Laravel, NestJS, Express, Vue, Angular), 13 vulnerability types |
| **Mobile** | 4 frameworks (React Native, Flutter, Ionic, Expo), 8 vulnerability types |
| **Scoring** | CVSS 3.1 with aggravating/mitigating context factors |
| **Compliance** | RGPD, PCI-DSS, HIPAA, SOC 2 |
| **Reports** | Web + Mobile + Executive Summary templates |

## Files

```
AGENT-BOOT.md      Boot sequence, oath, audit levels
SKILL.md           Main intelligence, taxonomy, rules
COMMANDS.md        Operational commands
USAGE-GUIDE.md     User-facing guide
MASTER.md          Full vulnerability taxonomy + scoring
web/               Web audit checklists, per-framework guides
mobile/            Mobile audit checklists, per-framework guides
shared/            Scoring, CVSS, OWASP mapping, compliance
reports/           Report templates (web, mobile, executive)
```

## Audit Levels

- **Quick Scan** (15-30 min): Secrets, critical CVEs, auth bypass
- **Standard** (1-2h): Full auth, inputs, config, dependencies
- **Deep** (3-5h): Threat modeling, business logic, architecture
- **Red Team** (on request): Kill chains, full exploitation

## Install

```bash
npx -y cyberaudit-skill install
```

## License

MIT
