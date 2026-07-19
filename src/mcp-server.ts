#!/usr/bin/env node

import { createInterface } from "readline";
import { readFileSync, existsSync, statSync } from "fs";
import { join, dirname, resolve } from "path";
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
];

export const capabilities = {
  tools: MCP_TOOLS,
};

function write(id: any, result: any) {
  process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id, ...result }) + "\n");
}

function handleToolCall(id: any, name: string, args: any) {
  const auditType = name.replace("cyberaudit-", "");

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
