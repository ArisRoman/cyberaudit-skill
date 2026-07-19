#!/usr/bin/env node

import { Command } from "commander";
import { existsSync, mkdirSync, cpSync, readdirSync, writeFileSync, readFileSync } from "fs";
import { createInterface } from "readline";
import { homedir } from "os";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = join(__dirname, "..");
const SKILL_SRC = join(PKG_ROOT, "skills", "cyberaudit");

type Agent = "opencode" | "claude-code" | "kiro" | "cursor" | "gemini";

const AGENT_TARGETS: Record<Agent, string[]> = {
  "opencode":   [join(homedir(), ".agents", "skills", "cyberaudit")],
  "claude-code": [join(homedir(), ".claude", "skills", "cyberaudit")],
  "kiro":       [join(homedir(), ".kiro", "skills", "cyberaudit")],
  "cursor":     [join(homedir(), ".cursor", "mcp.json")],
  "gemini":     [join(homedir(), ".gemini", "skills", "cyberaudit")],
};

function detectInstalledAgents(): Agent[] {
  const found: Agent[] = [];
  for (const [agent, paths] of Object.entries(AGENT_TARGETS)) {
    if (agent === "cursor" || agent === "gemini") continue;
    if (paths.some((p) => existsSync(dirname(p)))) {
      found.push(agent as Agent);
    }
  }
  if (existsSync(join(homedir(), ".cursor"))) found.push("cursor");
  if (existsSync(join(homedir(), ".gemini"))) found.push("gemini");
  return found;
}

function installSkill(targetDir: string, dryRun: boolean): boolean {
  if (!existsSync(SKILL_SRC)) {
    console.error(`✗ Skill source not found at ${SKILL_SRC}.`);
    return false;
  }

  if (existsSync(targetDir) && readdirSync(targetDir).length > 0) {
    console.log(`  ✓ Already installed at ${targetDir}`);
    return true;
  }

  if (dryRun) {
    console.log(`  → Would install to ${targetDir} (--dry-run)`);
    return true;
  }

  mkdirSync(targetDir, { recursive: true });
  cpSync(SKILL_SRC, targetDir, { recursive: true });
  console.log(`  ✓ Installed at ${targetDir} (${readdirSync(targetDir).length} files)`);
  return true;
}

function installForCursor(dryRun: boolean): boolean {
  const cursorDir = join(homedir(), ".cursor");
  if (!existsSync(cursorDir)) {
    console.log("  ~ Cursor not found (no ~/.cursor/)");
    return false;
  }

  const mcpPath = join(cursorDir, "mcp.json");
  let mcpConfig: any = { mcpServers: {} };

  if (existsSync(mcpPath)) {
    mcpConfig = JSON.parse(readFileSync(mcpPath, "utf-8"));
  }

  if (mcpConfig.mcpServers?.["cyberaudit-skill"]) {
    console.log(`  ✓ Cursor MCP already configured`);
    return true;
  }

  if (dryRun) {
    console.log(`  → Would add Cursor MCP entry to ${mcpPath}`);
    return true;
  }

  mcpConfig.mcpServers = mcpConfig.mcpServers || {};
  mcpConfig.mcpServers["cyberaudit-skill"] = {
    command: "npx",
    args: ["-y", "cyberaudit-skill", "serve"],
  };
  writeFileSync(mcpPath, JSON.stringify(mcpConfig, null, 2));
  console.log(`  ✓ Added Cursor MCP entry to ${mcpPath}`);
  return true;
}

function installForAgent(agent: Agent, dryRun: boolean): boolean {
  switch (agent) {
    case "cursor":
      return installForCursor(dryRun);
    default: {
      const paths = AGENT_TARGETS[agent];
      if (!paths?.length) return false;
      return installSkill(paths[0], dryRun);
    }
  }
}

async function main() {
  const program = new Command();

  program
    .name("cyberaudit-skill")
    .description("CyberAudit Skill — universal security audit skill for AI agents")
    .version("3.0.0");

  program
    .command("install")
    .description("Install CyberAudit Skill for AI agent(s)")
    .option("-a, --agent <agent>", "Target: opencode, claude-code, kiro, cursor, gemini, or all", "all")
    .option("--dry-run", "Show changes without applying", false)
    .action((options) => {
      const dryRun = !!options.dryRun;
      const agentOpt = (options.agent || "all").toLowerCase();

      let agents: Agent[];
      if (agentOpt === "all") {
        agents = detectInstalledAgents();
        if (agents.length === 0) {
          console.log("No supported AI agents detected.\nTry: --agent opencode");
          process.exit(1);
        }
      } else {
        const valid: Agent[] = ["opencode", "claude-code", "kiro", "cursor", "gemini"];
        if (!valid.includes(agentOpt as Agent)) {
          console.error(`Unknown agent: "${agentOpt}". Valid: ${valid.join(", ")}`);
          process.exit(1);
        }
        agents = [agentOpt as Agent];
      }

      const label = dryRun ? " (dry run)" : "";
      console.log(`\n═══ CyberAudit Installation${label} ═══\n`);

      let ok = 0, fail = 0;
      for (const agent of agents) {
        const name = agent.charAt(0).toUpperCase() + agent.slice(1);
        if (installForAgent(agent, dryRun)) ok++; else fail++;
      }

      console.log(`\nDone. ${ok} configured, ${fail} skipped.\n`);
      if (!dryRun) console.log("Verify: cyberaudit-skill list\n");
    });

  program
    .command("list")
    .description("List audits and installed agents")
    .action(() => {
      console.log("\n═══ CyberAudit — Available Audits ═══\n");
      console.log("  cyberaudit-web       OWASP web app security audit");
      console.log("  cyberaudit-mobile    OWASP mobile app security audit");
      console.log("  cyberaudit-api       API security audit");
      console.log("  cyberaudit-cloud     Cloud config audit");
      console.log("  cyberaudit-full      Full stack (web + API + cloud)");
      console.log("  cyberaudit-quick     Quick vulnerability scan\n");
      console.log("═══ Installed Agents ═══\n");
      for (const [agent] of Object.entries(AGENT_TARGETS)) {
        if (agent === "cursor") {
          const mcpPath = join(homedir(), ".cursor", "mcp.json");
          const ok = existsSync(mcpPath) && readFileSync(mcpPath, "utf-8").includes("cyberaudit-skill");
          console.log(`  ${ok ? "✓" : "✗"} ${agent}`);
        } else {
          const paths = AGENT_TARGETS[agent as Agent];
          const ok = paths.some((p) => existsSync(p));
          console.log(`  ${ok ? "✓" : "✗"} ${agent}`);
        }
      }
      console.log();
    });

  program
    .command("serve")
    .description("Start CyberAudit MCP server (stdio)")
    .action(() => {
      console.error("[CyberAudit] MCP server starting...");
      startMcpServer();
    });

  program.parse(process.argv);
}

function startMcpServer() {
  const rl = createInterface({ input: process.stdin });

  const capabilities = {
    tools: [
      {
        name: "cyberaudit-web",
        description: "Web app security audit (OWASP Top 10)",
        inputSchema: {
          type: "object",
          properties: {
            target: { type: "string", description: "URL or project path" },
            depth: { type: "string", enum: ["quick", "standard", "deep"], default: "standard" },
          },
        },
      },
      {
        name: "cyberaudit-mobile",
        description: "Mobile app security audit (OWASP MASVS)",
        inputSchema: {
          type: "object",
          properties: {
            target: { type: "string", description: "App package or project path" },
            platform: { type: "string", enum: ["android", "ios", "both"], default: "both" },
          },
        },
      },
      {
        name: "cyberaudit-api",
        description: "API security audit",
        inputSchema: {
          type: "object",
          properties: {
            target: { type: "string", description: "API endpoint or spec file" },
          },
        },
      },
      {
        name: "cyberaudit-list",
        description: "List all available audit types",
        inputSchema: { type: "object", properties: {} },
      },
    ],
  };

  function write(id: any, result: any) {
    process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id, ...result }) + "\n");
  }

  rl.on("line", (line) => {
    try {
      const msg = JSON.parse(line.trim());
      const id = msg.id;

      if (msg.method === "initialize") {
        write(id, { protocolVersion: "2024-11-05", capabilities, serverInfo: { name: "cyberaudit-skill", version: "3.0.0" } });
      } else if (msg.method === "tools/list") {
        write(id, capabilities);
      } else if (msg.method === "tools/call") {
        write(id, {
          content: [{ type: "text", text: `[CyberAudit] "${msg.params.name}" called with ${JSON.stringify(msg.params.arguments)}\n\nRun the audit by loading the CyberAudit Skill.` }],
        });
      } else {
        write(id, { error: { code: -32601, message: `Unknown method: ${msg.method}` } });
      }
    } catch { /* skip malformed */ }
  });
}

main().catch((err) => {
  console.error("[CyberAudit] Fatal error:", err);
  process.exit(1);
});
