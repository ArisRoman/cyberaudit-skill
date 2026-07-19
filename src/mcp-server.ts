#!/usr/bin/env node

import { createInterface } from "readline";
import { writeFileSync, readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";
import { homedir } from "os";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SKILL_DIR = join(__dirname, "..", "skills", "cyberaudit");

const capabilities = {
  tools: [
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
      description: "Run an API security audit",
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
      description: "Run a cloud configuration security audit",
      inputSchema: {
        type: "object",
        properties: {
          target: { type: "string", description: "Cloud provider or config file path" },
        },
        required: ["target"],
      },
    },
    {
      name: "cyberaudit-quick",
      description: "Run a quick vulnerability scan (5-minute assessment)",
      inputSchema: {
        type: "object",
        properties: {
          target: { type: "string", description: "URL, domain, or project path" },
        },
        required: ["target"],
      },
    },
  ],
};

function write(id: any, result: any) {
  process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id, ...result }) + "\n");
}

function handleToolCall(id: any, name: string, args: any) {
  const auditType = name.replace("cyberaudit-", "");

  write(id, {
    content: [
      {
        type: "text",
        text: `▶ CyberAudit: ${auditType.toUpperCase()} audit requested

Target: ${args.target}
${args.depth ? `Depth: ${args.depth}` : ""}
${args.platform ? `Platform: ${args.platform}` : ""}

To execute the full audit, load the CyberAudit Skill and run:

/${name} "${args.target}"

The skill will guide you through all checks, scoring, and report generation.

Skill location: ${SKILL_DIR}`,
      },
    ],
  });
}

const rl = createInterface({ input: process.stdin });

rl.on("line", (line) => {
  try {
    const msg = JSON.parse(line.trim());
    const id = msg.id;

    switch (msg.method) {
      case "initialize":
        write(id, {
          protocolVersion: "2024-11-05",
          capabilities,
          serverInfo: { name: "cyberaudit-skill", version: "3.0.0" },
        });
        break;

      case "tools/list":
        write(id, capabilities);
        break;

      case "tools/call":
        handleToolCall(id, msg.params.name, msg.params.arguments || {});
        break;

      case "notifications/initialized":
        // no response expected
        break;

      default:
        write(id, { error: { code: -32601, message: `Method not found: ${msg.method}` } });
    }
  } catch (e) {
    // ignore malformed input
  }
});

process.on("SIGINT", () => process.exit(0));
process.on("SIGTERM", () => process.exit(0));

console.error(`[CyberAudit] MCP server ready | Skill: ${SKILL_DIR}`);
