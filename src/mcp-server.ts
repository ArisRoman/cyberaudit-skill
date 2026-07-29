#!/usr/bin/env node

import { createInterface } from "readline";
import { readFileSync, existsSync, statSync, readdirSync } from "fs";
import { join, dirname, resolve, extname, relative } from "path";
import { fileURLToPath } from "url";
import { scanSecrets, formatFindingsText } from "./scanners/secrets.js";
import { scanWeb, formatWebFindingsText } from "./scanners/web.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = join(__dirname, "..");
const SKILL_DIR = join(PKG_ROOT, "skills", "cyberaudit");

function getVersion(): string {
  try {
    const pkgPath = join(PKG_ROOT, "package.json");
    if (existsSync(pkgPath)) {
      const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
      return pkg.version || "3.1.5";
    }
  } catch {}
  return "3.1.5";
}

const VERSION = getVersion();

export const MCP_TOOLS = [
  {
    name: "cyberaudit-web",
    description: "Run a web application security audit (OWASP Top 10)",
    inputSchema: {
      type: "object",
      properties: {
        target: { type: "string", description: "URL, domain, or project path to audit" },
        depth: { type: "string", enum: ["quick", "standard", "deep"], default: "standard" },
      },
      required: ["target"],
    },
  },
  {
    name: "cyberaudit-mobile",
    description: "Run a mobile application security audit (OWASP MASVS)",
    inputSchema: {
      type: "object",
      properties: {
        target: { type: "string", description: "App identifier, APK/IPA path, or project path" },
        platform: { type: "string", enum: ["android", "ios", "both"], default: "both" },
      },
      required: ["target"],
    },
  },
  {
    name: "cyberaudit-api",
    description: "Run an API security audit (OWASP API Top 10)",
    inputSchema: {
      type: "object",
      properties: {
        target: { type: "string", description: "API base URL, OpenAPI spec path, or project directory" },
      },
      required: ["target"],
    },
  },
  {
    name: "cyberaudit-cloud",
    description: "Run a cloud configuration security audit (AWS/GCP/Azure S3, IAM, SG, storage)",
    inputSchema: {
      type: "object",
      properties: {
        target: { type: "string", description: "Cloud provider, IaC path (terraform/cloudformation), or config file path" },
      },
      required: ["target"],
    },
  },
  {
    name: "cyberaudit-quick",
    description: "Run a quick vulnerability scan (5-minute assessment, secrets + criticals) — deterministic scanner included",
    inputSchema: {
      type: "object",
      properties: {
        target: { type: "string", description: "URL, domain, or project path" },
      },
      required: ["target"],
    },
  },
  {
    name: "cyberaudit-list",
    description: "List all available audit types and check installation",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "cyberaudit-get-scope",
    description: "Analyze a directory to find high-risk files (routes, database, auth, file ops) to focus your audit, preventing token drain on boilerplate files.",
    inputSchema: {
      type: "object",
      properties: {
        target: { type: "string", description: "Project directory to analyze" },
      },
      required: ["target"],
    },
  },
  {
    name: "cyberaudit-get-reference",
    description: "Fetch a hyper-targeted and condensed security checklist, philosophy or remediation code snippet for a specific topic, consuming 90% fewer tokens.",
    inputSchema: {
      type: "object",
      properties: {
        topic: {
          type: "string",
          enum: [
            "web-checklist", "web-sqli", "web-xss", "web-auth", "web-csrf", "web-ssrf", 
            "mobile-checklist", "mobile-storage", "mobile-network", "api-checklist", "cloud-checklist"
          ],
          description: "The topic of reference information required"
        }
      },
      required: ["topic"],
    },
  },
];

export const capabilities = {
  tools: MCP_TOOLS,
};

function write(id: any, result: any) {
  process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id, ...result }) + "\n");
}

function handleGetScope(targetDir: string): string {
  try {
    const resolvedTarget = resolve(targetDir);
    if (!existsSync(resolvedTarget)) {
      return `Target directory not found: ${targetDir}`;
    }

    const highRiskFiles: Array<{ file: string; score: number; categories: string[] }> = [];
    const walk = (dir: string) => {
      let list;
      try { list = readdirSync(dir); } catch { return; }
      for (const entry of list) {
        if (['node_modules', '.git', 'dist', 'build', '.next', '.nuxt', 'coverage', '.cache'].includes(entry)) continue;
        const fullPath = join(dir, entry);
        let stat;
        try { stat = statSync(fullPath); } catch { continue; }
        if (stat.isDirectory()) {
          walk(fullPath);
        } else if (stat.isFile() && stat.size < 500000) {
          const ext = extname(fullPath).toLowerCase();
          if (['.js', '.ts', '.jsx', '.tsx', '.vue', '.php', '.py', '.go', '.java', '.rb', '.cs'].includes(ext)) {
            let content = "";
            try { content = readFileSync(fullPath, 'utf-8'); } catch { continue; }
            
            const categories: string[] = [];
            let score = 0;

            if (/(?:db|pool|connection|client|prisma)\.(?:query|execute|find|create|\$queryRaw)\b/i.test(content)) {
              categories.push("Database/SQL");
              score += 3;
            }
            if (/\b(?:jwt|decode|verify|token|login|register|password|session|auth)\b/i.test(content)) {
              categories.push("Auth/JWT");
              score += 2;
            }
            if (/\b(?:req\.query|req\.body|req\.params|req\.headers)\b/i.test(content)) {
              categories.push("User Input");
              score += 2;
            }
            if (/\b(?:dangerouslySetInnerHTML|innerHTML|v-html)\b/i.test(content)) {
              categories.push("XSS Sink");
              score += 2;
            }
            if (/\b(?:fs\.(?:readFile|writeFile|createReadStream|createWriteStream)|upload|multer)\b/i.test(content)) {
              categories.push("File Operations");
              score += 2;
            }
            if (/\b(?:exec|spawn|eval|Function)\b/i.test(content)) {
              categories.push("Command Execution");
              score += 4;
            }
            if (/\b(?:axios|fetch|request|http\.get|https\.get)\b/i.test(content)) {
              categories.push("Network/SSRF");
              score += 1;
            }

            if (score > 0) {
              highRiskFiles.push({
                file: relative(resolvedTarget, fullPath),
                score,
                categories,
              });
            }
          }
        }
      }
    };

    walk(resolvedTarget);
    highRiskFiles.sort((a, b) => b.score - a.score);

    if (highRiskFiles.length === 0) {
      return `✅ No high-risk code files identified in ${targetDir}. Looks like boilerplate or static assets only.`;
    }

    let report = `═══ CyberAudit Scope Analyzer ═══\n`;
    report += `Analyzed: ${targetDir}\n`;
    report += `Top ${Math.min(15, highRiskFiles.length)} High-Risk Files to Focus Your Security Audit (ranked by risk score):\n\n`;
    
    for (const f of highRiskFiles.slice(0, 15)) {
      report += `🔥 Risk Score: ${f.score} | [${f.categories.join(", ")}] — ${f.file}\n`;
    }
    report += `\n💡 Action: Focus your /audit and file audits on these specific files first to save 90% of your token quota and perform a surgically precise audit.`;
    return report;
  } catch (e: any) {
    return `Error during scope analysis: ${e.message}`;
  }
}

function handleGetReference(topic: string): string {
  const map: Record<string, string> = {
    "web-checklist": "web/WEB-CHECKLIST.md",
    "web-sqli": "web/vulnerabilities/INJECTION.md",
    "web-xss": "web/vulnerabilities/XSS.md",
    "web-auth": "web/vulnerabilities/AUTH-AUTHZ.md",
    "web-csrf": "web/vulnerabilities/CSRF.md",
    "web-ssrf": "web/vulnerabilities/SSRF.md",
    "mobile-checklist": "mobile/MOBILE-CHECKLIST.md",
    "mobile-storage": "mobile/vulnerabilities/STORAGE.md",
    "mobile-network": "mobile/vulnerabilities/NETWORK-MOBILE.md",
    "api-checklist": "api/API-CHECKLIST.md",
    "cloud-checklist": "cloud/CLOUD-CHECKLIST.md",
  };

  const relPath = map[topic];
  if (!relPath) return `Topic reference "${topic}" is not supported.`;

  const fullPath = join(SKILL_DIR, relPath);
  if (!existsSync(fullPath)) {
    return `Reference file for ${topic} could not be found at ${fullPath}.`;
  }

  try {
    const raw = readFileSync(fullPath, "utf-8");
    // Compress markdown by stripping large header blocks and comments to save tokens
    const lines = raw.split("\n")
      .map(line => line.trim())
      .filter(line => line && !line.startsWith("===") && !line.startsWith("---") && !line.startsWith("# "))
      .join("\n");

    return `═══ Condensed Security Reference for ${topic.toUpperCase()} ═══\n\n${lines.slice(0, 12000)}`;
  } catch (e: any) {
    return `Failed to load reference: ${e.message}`;
  }
}

function handleToolCall(id: any, name: string, args: any) {
  const auditType = name.replace("cyberaudit-", "");

  if (name === "cyberaudit-get-scope" && args.target) {
    const report = handleGetScope(args.target);
    write(id, { result: { content: [{ type: "text", text: report }] } });
    return;
  }

  if (name === "cyberaudit-get-reference" && args.topic) {
    const report = handleGetReference(args.topic);
    write(id, { result: { content: [{ type: "text", text: report }] } });
    return;
  }

  if (name === "cyberaudit-web") {
    const checklist = handleGetReference("web-checklist");
    let scanResults = "";
    if (args.target) {
      try {
        const targetPath = resolve(args.target);
        if (existsSync(targetPath)) {
          const findings = scanWeb(targetPath);
          scanResults = formatWebFindingsText(findings, args.target);
        }
      } catch (e: any) {
        scanResults = `Error scanning web: ${e.message}`;
      }
    }
    write(id, {
      result: {
        content: [
          {
            type: "text",
            text: `▶ CyberAudit ${VERSION}: WEB AUDIT (OWASP Top 10) Requested\n\nTarget: ${args.target || "."}\n\n${scanResults}\n\n${checklist}`
          }
        ]
      }
    });
    return;
  }

  if (name === "cyberaudit-mobile") {
    const checklist = handleGetReference("mobile-checklist");
    write(id, {
      result: {
        content: [
          {
            type: "text",
            text: `▶ CyberAudit ${VERSION}: MOBILE AUDIT (OWASP MASVS) Requested\n\nTarget: ${args.target || "not provided"}\nPlatform: ${args.platform || "both"}\n\n${checklist}\n\n💡 Note: Mobile security auditing is currently LLM-driven using the above guidelines.`
          }
        ]
      }
    });
    return;
  }

  if (name === "cyberaudit-api") {
    const checklist = handleGetReference("api-checklist");
    write(id, {
      result: {
        content: [
          {
            type: "text",
            text: `▶ CyberAudit ${VERSION}: API AUDIT (OWASP API Top 10) Requested\n\nTarget: ${args.target || "not provided"}\n\n${checklist}\n\n💡 Note: API security auditing is currently LLM-driven using the above guidelines.`
          }
        ]
      }
    });
    return;
  }

  if (name === "cyberaudit-cloud") {
    const checklist = handleGetReference("cloud-checklist");
    write(id, {
      result: {
        content: [
          {
            type: "text",
            text: `▶ CyberAudit ${VERSION}: CLOUD CONFIGURATION AUDIT Requested\n\nTarget: ${args.target || "not provided"}\n\n${checklist}\n\n💡 Note: Cloud config security auditing is currently LLM-driven using the above guidelines.\nReference: cloud/CLOUD-CHECKLIST.md`
          }
        ]
      }
    });
    return;
  }

  if (name === "cyberaudit-list") {
    write(id, {
      result: {
        content: [
          {
            type: "text",
            text: `═══ CyberAudit ${VERSION} — Available Audits ═══

• cyberaudit-web: OWASP Top 10 web app audit
• cyberaudit-mobile: OWASP MASVS mobile audit
• cyberaudit-api: OWASP API Top 10 audit
• cyberaudit-cloud: Cloud config audit (S3, IAM, SG, storage)
• cyberaudit-quick: Quick 5-minute scan (secrets + criticals) — DETERMINISTIC SCANNER
• cyberaudit-get-scope: Target high-risk code files to audit (saves 95% tokens)
• cyberaudit-get-reference: Load targeted checklists and remediations on-demand
• cyberaudit-full: Full stack (web + api + cloud) via /audit

Skill location: ${SKILL_DIR}
Docs: https://github.com/ArisRoman/cyberaudit-skill
Scanner: deterministic secrets detection 15 patterns`,
          },
        ],
      },
    });
    return;
  }

  if (name === "cyberaudit-quick" && args.target) {
    try {
      const targetPath = resolve(args.target);
      if (existsSync(targetPath)) {
        const stat = statSync(targetPath);
        if (stat.isDirectory() || stat.isFile()) {
          const secretFindings = scanSecrets(targetPath);
          const webFindings = scanWeb(targetPath);
          const secretReport = formatFindingsText(secretFindings, args.target);
          const webReport = formatWebFindingsText(webFindings, args.target);
          write(id, {
            result: {
              content: [
                {
                  type: "text",
                  text: `▶ CyberAudit ${VERSION}: QUICK deterministic scan completed\n\n${secretReport}\n${webReport}\n---\nTotal: ${secretFindings.length + webFindings.length} findings (secrets:${secretFindings.length} web:${webFindings.length})\nFor full context-aware audit, load skill and run:\n/${name} "${args.target}"\n\nSkill location: ${SKILL_DIR}\nChecklist: ${SKILL_DIR}/cloud/CLOUD-CHECKLIST.md\nCLI: npx cyberaudit-skill scan "${args.target}" --json`,
                },
              ],
            },
          });
          return;
        }
      }
    } catch (e: any) {
      console.error(`[CyberAudit] Quick scan failed for ${args.target}: ${e.message}`);
    }
  }

  write(id, {
    result: {
      content: [
        {
          type: "text",
          text: `▶ CyberAudit ${VERSION}: ${auditType.toUpperCase()} audit requested

Target: ${args.target || "not provided"}
${args.depth ? `Depth: ${args.depth}\n` : ""}${args.platform ? `Platform: ${args.platform}\n` : ""}
To execute the full audit, load the CyberAudit Skill and run:

/${name} "${args.target || "."}"

The skill will guide you through all checks, scoring, and report generation.

Skill location: ${SKILL_DIR}
Cloud checklist: ${SKILL_DIR}/cloud/CLOUD-CHECKLIST.md
Secrets scanner: npx cyberaudit-skill scan "${args.target || "."}"`,
        },
      ],
    },
  });
}

export function startMcpServer() {
  const rl = createInterface({ input: process.stdin });

  rl.on("line", (line) => {
    try {
      const trimmed = line.trim();
      if (!trimmed) return;
      const msg = JSON.parse(trimmed);
      const id = msg.id;

      switch (msg.method) {
        case "initialize":
          write(id, {
            result: {
              protocolVersion: "2024-11-05",
              capabilities,
              serverInfo: { name: "cyberaudit-skill", version: VERSION },
            },
          });
          break;

        case "tools/list":
          write(id, {
            result: capabilities,
          });
          break;

        case "tools/call":
          handleToolCall(id, msg.params?.name, msg.params?.arguments || {});
          break;

        case "notifications/initialized":
          break;

        default:
          if (id !== undefined) {
            write(id, { error: { code: -32601, message: `Method not found: ${msg.method}` } });
          }
      }
    } catch {
      // ignore malformed
    }
  });

  process.on("SIGINT", () => process.exit(0));
  process.on("SIGTERM", () => process.exit(0));

  console.error(`[CyberAudit] MCP server ready v${VERSION} | Skill: ${SKILL_DIR}`);
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("mcp-server.js") || process.argv[1]?.endsWith("mcp-server.ts")) {
  startMcpServer();
}
