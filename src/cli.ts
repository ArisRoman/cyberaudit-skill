#!/usr/bin/env node

import { Command } from "commander";
import { existsSync, mkdirSync, cpSync, readdirSync, writeFileSync, readFileSync, rmSync, unlinkSync, copyFileSync } from "fs";
import { homedir } from "os";
import { join, dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { startMcpServer as startMcpServerImpl } from "./mcp-server.js";
import { scanSecrets, formatFindingsText } from "./scanners/secrets.js";
import { scanWeb, formatWebFindingsText } from "./scanners/web.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = join(__dirname, "..");
const PKG = JSON.parse(readFileSync(join(PKG_ROOT, "package.json"), "utf-8"));
const SKILL_SRC = join(PKG_ROOT, "skills", "cyberaudit");
const COMMANDS_SRC = join(SKILL_SRC, "commands");
const VERSION = PKG.version || "3.1.5";

// 8 main commands that appear when typing "/" — like ui-ux-pro's approach
const MAIN_COMMANDS = [
  'audit.md',              // /audit
  'audit-web.md',          // /audit:web
  'audit-mobile.md',       // /audit:mobile
  'audit-api.md',          // /audit:api
  'audit-cloud.md',        // /audit:cloud
  'audit-quick.md',        // /audit:quick
  'audit-report.md',       // /audit:report
  'audit-help.md',         // /audit:help
];

// All agents from ui-ux-pro + ours (19 total) — matching ui-ux-pro-max-skill coverage
export type Agent =
  | "opencode"
  | "claude-code"
  | "cursor"
  | "windsurf"
  | "antigravity"
  | "antigravity-cli"
  | "copilot"
  | "kiro"
  | "codex"
  | "qoder"
  | "roocode"
  | "gemini"
  | "trae"
  | "continue"
  | "codebuddy"
  | "droid"
  | "kilocode"
  | "warp"
  | "augment"
  | "codewhale"
  | "cline"
  | "aider";

interface AgentConfig {
  displayName: string;
  skillPaths: string[];      // where to copy full skill
  commandPaths: string[];    // where to copy slash-commands ("/" menu)
  workflowPaths?: string[];  // Windsurf/Antigravity use workflows folder
  mcpPath?: string;          // Cursor etc. use mcp.json
  docsUrl?: string;
}

const H = homedir();

function j(...parts: string[]): string {
  return join(H, ...parts);
}

export const AGENT_CONFIG: Record<Agent, AgentConfig> = {
  "opencode": {
    displayName: "OpenCode",
    skillPaths: [j(".agents", "skills", "cyberaudit"), j(".config", "opencode", "skills", "cyberaudit")],
    commandPaths: [j(".config", "opencode", "commands")],
  },
  "claude-code": {
    displayName: "Claude Code",
    skillPaths: [j(".claude", "skills", "cyberaudit")],
    commandPaths: [j(".claude", "commands")],
  },
  "cursor": {
    displayName: "Cursor",
    skillPaths: [j(".cursor", "skills", "cyberaudit")],
    commandPaths: [j(".cursor", "commands")],
    mcpPath: j(".cursor", "mcp.json"),
  },
  "windsurf": {
    displayName: "Windsurf",
    skillPaths: [j(".windsurf", "skills", "cyberaudit"), j(".codeium", "windsurf", "skills", "cyberaudit")],
    commandPaths: [j(".windsurf", "commands")],
    workflowPaths: [j(".windsurf", "workflows")],
  },
  "antigravity": {
    displayName: "Antigravity",
    skillPaths: [j(".gemini", "antigravity", "skills", "cyberaudit"), j(".agent", "skills", "cyberaudit")],
    commandPaths: [j(".gemini", "antigravity", "commands"), j(".agent", "commands")],
    workflowPaths: [j(".agent", "workflows")],
  },
  "antigravity-cli": {
    displayName: "Antigravity CLI",
    skillPaths: [j(".gemini", "antigravity-cli", "skills", "cyberaudit")],
    commandPaths: [j(".gemini", "antigravity-cli", "commands")],
  },
  "copilot": {
    displayName: "GitHub Copilot",
    skillPaths: [j(".copilot", "skills", "cyberaudit"), j(".github", "copilot", "skills", "cyberaudit")],
    commandPaths: [j(".copilot", "commands"), j(".github", "copilot", "commands")],
  },
  "kiro": {
    displayName: "Kiro",
    skillPaths: [j(".kiro", "skills", "cyberaudit")],
    commandPaths: [j(".kiro", "commands")],
  },
  "codex": {
    displayName: "Codex CLI",
    skillPaths: [j(".codex", "skills", "cyberaudit")],
    commandPaths: [j(".codex", "commands")],
  },
  "qoder": {
    displayName: "Qoder",
    skillPaths: [j(".qoder", "skills", "cyberaudit")],
    commandPaths: [j(".qoder", "commands")],
  },
  "roocode": {
    displayName: "Roo Code",
    skillPaths: [j(".roo", "skills", "cyberaudit"), j(".roocode", "skills", "cyberaudit")],
    commandPaths: [j(".roo", "commands"), j(".roocode", "commands")],
  },
  "gemini": {
    displayName: "Gemini CLI",
    skillPaths: [j(".gemini", "skills", "cyberaudit")],
    commandPaths: [j(".gemini", "commands")],
  },
  "trae": {
    displayName: "Trae",
    skillPaths: [j(".trae", "skills", "cyberaudit")],
    commandPaths: [j(".trae", "commands")],
  },
  "continue": {
    displayName: "Continue",
    skillPaths: [j(".continue", "skills", "cyberaudit")],
    commandPaths: [j(".continue", "commands")],
  },
  "codebuddy": {
    displayName: "CodeBuddy",
    skillPaths: [j(".codebuddy", "skills", "cyberaudit")],
    commandPaths: [j(".codebuddy", "commands")],
  },
  "droid": {
    displayName: "Droid (Factory)",
    skillPaths: [j(".factory", "skills", "cyberaudit"), j(".factory", "droid", "skills", "cyberaudit")],
    commandPaths: [j(".factory", "commands"), j(".factory", "droid", "commands")],
  },
  "kilocode": {
    displayName: "KiloCode",
    skillPaths: [j(".kilocode", "skills", "cyberaudit"), j(".kilo", "skills", "cyberaudit")],
    commandPaths: [j(".kilocode", "commands"), j(".kilo", "commands")],
  },
  "warp": {
    displayName: "Warp",
    skillPaths: [j(".warp", "skills", "cyberaudit")],
    commandPaths: [j(".warp", "commands")],
  },
  "augment": {
    displayName: "Augment",
    skillPaths: [j(".augment", "skills", "cyberaudit")],
    commandPaths: [j(".augment", "commands")],
  },
  "codewhale": {
    displayName: "CodeWhale",
    skillPaths: [j(".codewhale", "skills", "cyberaudit")],
    commandPaths: [j(".codewhale", "commands")],
  },
  "cline": {
    displayName: "Cline",
    skillPaths: [j(".cline", "skills", "cyberaudit")],
    commandPaths: [j(".cline", "commands")],
  },
  "aider": {
    displayName: "Aider",
    skillPaths: [j(".aider", "skills", "cyberaudit")],
    commandPaths: [j(".aider", "commands")],
  },
};

// Backward compat: old AGENT_TARGETS used only for simple lookup
export const AGENT_TARGETS: Record<string, string[]> = Object.fromEntries(
  Object.entries(AGENT_CONFIG).map(([k, v]) => [k, v.skillPaths])
);

// Paths that are safe to write (must be inside HOME)
function isSafeInsideHome(p: string): boolean {
  const home = resolve(H);
  const resolved = resolve(p);
  return resolved.startsWith(home);
}

function isSafeSkillPath(p: string): boolean {
  return isSafeInsideHome(p) && p.includes("cyberaudit");
}

function isSafeCommandPath(p: string): boolean {
  // Commands can be without cyberaudit in path, but must be inside HOME and be known command dir
  if (!isSafeInsideHome(p)) return false;
  // allow if path contains commands or workflows or skills
  return p.includes("commands") || p.includes("workflows") || p.includes("skills");
}

function detectInstalledAgents(): Agent[] {
  const found: Agent[] = [];
  for (const [agent, cfg] of Object.entries(AGENT_CONFIG) as [Agent, AgentConfig][]) {
    // If any of skillPaths parent dir exists, or commandPaths parent exists, or mcpPath parent exists
    const checkPaths = [
      ...cfg.skillPaths.map(p => dirname(p)),
      ...cfg.commandPaths.map(p => p),
      ...(cfg.workflowPaths || []).map(p => p),
      ...(cfg.mcpPath ? [dirname(cfg.mcpPath)] : []),
    ];
    if (checkPaths.some(parent => existsSync(parent) || existsSync(dirname(parent)))) {
      // More precise: check if parent of parent exists (e.g., ~/.claude exists)
      if (checkPaths.some(parent => existsSync(parent))) {
        found.push(agent);
      } else {
        // Fallback: check grandparent e.g., ~/.claude exists for ~/.claude/skills
        const grandParents = cfg.skillPaths.map(p => join(H, p.split('/')[1] || ''));
        // Actually check home subfolders existence via first level
        const firstLevel = cfg.skillPaths[0].split('/').slice(0,3).join('/');
        if (existsSync(firstLevel) || existsSync(join(H, `.${agent.split('-')[0]}`))) {
          // not perfect, skip to avoid false positives
        }
      }
    }
  }
  // Always include opencode if ~/.agents exists, cursor if ~/.cursor exists, etc. (legacy behavior)
  if (existsSync(j(".agents"))) {
    if (!found.includes("opencode" as Agent)) found.push("opencode" as Agent);
  }
  if (existsSync(j(".claude"))) {
    if (!found.includes("claude-code" as Agent)) found.push("claude-code" as Agent);
  }
  if (existsSync(j(".cursor"))) {
    if (!found.includes("cursor" as Agent)) found.push("cursor" as Agent);
  }
  // Ensure uniqueness
  return [...new Set(found)];
}

// Safer detection: check if agent's home folder exists at all (e.g., ~/.claude, ~/.cursor, etc.)
function detectByHomeFolders(): Agent[] {
  const mapping: Record<string, Agent> = {
    ".agents": "opencode",
    ".claude": "claude-code",
    ".cursor": "cursor",
    ".windsurf": "windsurf",
    ".codeium": "windsurf",
    ".agent": "antigravity",
    ".copilot": "copilot",
    ".kiro": "kiro",
    ".codex": "codex",
    ".qoder": "qoder",
    ".roo": "roocode",
    ".roocode": "roocode",
    ".gemini": "gemini",
    ".trae": "trae",
    ".continue": "continue",
    ".codebuddy": "codebuddy",
    ".factory": "droid",
    ".kilocode": "kilocode",
    ".kilo": "kilocode",
    ".warp": "warp",
    ".augment": "augment",
    ".codewhale": "codewhale",
    ".cline": "cline",
    ".aider": "aider",
  };
  const found: Agent[] = [];
  for (const [folder, agent] of Object.entries(mapping)) {
    if (existsSync(j(folder))) {
      if (!found.includes(agent as Agent)) found.push(agent as Agent);
    }
  }
  // Special: .agents for opencode already, .config/opencode also
  if (existsSync(j(".config", "opencode"))) {
    if (!found.includes("opencode")) found.push("opencode");
  }
  return found;
}

function installDir(src: string, dst: string, allowCommandPath = false): void {
  if (!existsSync(src)) throw new Error(`Source not found: ${src}`);
  const safeCheck = allowCommandPath ? isSafeCommandPath : isSafeSkillPath;
  if (!safeCheck(dst)) {
    console.error(`✗ Unsafe destination blocked: ${dst}`);
    throw new Error(`Unsafe path: ${dst}`);
  }
  if (existsSync(dst)) {
    console.log(`  ♻️  Cleaning previous install at ${dst}`);
    rmSync(dst, { recursive: true, force: true });
  }
  mkdirSync(dirname(dst), { recursive: true });
  cpSync(src, dst, { recursive: true });
}

function installCommands(commandFiles: string[], targetDir: string, dryRun: boolean, agentName: string): void {
  const safe = isSafeCommandPath(targetDir);
  if (!safe) {
    console.error(`  ✗ Unsafe command destination blocked: ${targetDir}`);
    return;
  }
  if (dryRun) {
    console.log(`  → Would install ${commandFiles.length} commands to ${targetDir} (--dry-run)`);
    return;
  }
  mkdirSync(targetDir, { recursive: true });
  // Remove stale audit commands only (keep other commands like ui-ux-pro-max, caveman etc.)
  try {
    if (existsSync(targetDir)) {
      const stale = readdirSync(targetDir).filter(f => typeof f === "string" && f.startsWith("audit") && f.endsWith(".md"));
      if (stale.length > 0) {
        console.log(`  ♻️  Removing ${stale.length} stale audit commands from ${agentName}: ${stale.join(", ")}`);
        for (const f of stale) {
          try { unlinkSync(join(targetDir, f)); } catch {}
        }
      }
    }
  } catch {}

  const cmdSrcDir = COMMANDS_SRC;
  for (const fileName of commandFiles) {
    const src = join(cmdSrcDir, fileName);
    if (!existsSync(src)) continue;
    const dst = join(targetDir, fileName);
    try {
      mkdirSync(dirname(dst), { recursive: true });
      copyFileSync(src, dst);
    } catch (e: any) {
      console.error(`  ✗ Failed to copy command ${fileName} to ${targetDir}: ${e.message}`);
    }
  }
  console.log(`  ✓ Commands (${commandFiles.length}) installed to ${agentName} (${targetDir}) — typing "/" will show ${commandFiles.length} main commands`);
}

function installSkillForAgent(agent: Agent, dryRun: boolean): boolean {
  const cfg = AGENT_CONFIG[agent];
  if (!cfg) {
    console.error(`Unknown agent: ${agent}`);
    return false;
  }

  if (!existsSync(SKILL_SRC)) {
    console.error(`✗ Skill source not found at ${SKILL_SRC}.`);
    return false;
  }

  if (dryRun) {
    for (const sp of cfg.skillPaths) {
      console.log(`  → Would install skill to ${sp} (--dry-run)`);
    }
    for (const cp of cfg.commandPaths) {
      console.log(`  → Would install ${MAIN_COMMANDS.length} main commands to ${cp} (--dry-run)`);
    }
    if (cfg.workflowPaths) {
      for (const wp of cfg.workflowPaths) {
        console.log(`  → Would install ${MAIN_COMMANDS.length} workflows to ${wp} (--dry-run)`);
      }
    }
    if (cfg.mcpPath) {
      console.log(`  → Would configure MCP at ${cfg.mcpPath} (--dry-run)`);
    }
    return true;
  }

  let ok = false;

  // Install skill to all skillPaths
  for (const skillPath of cfg.skillPaths) {
    try {
      installDir(SKILL_SRC, skillPath, false);
      console.log(`  ✓ Skill installed at ${skillPath}`);
      ok = true;
    } catch (e: any) {
      console.error(`  ✗ Failed skill install at ${skillPath}: ${e.message}`);
    }
  }

  // Install MAIN_COMMANDS to commandPaths (for "/" menu)
  // For opencode, install ALL commands (60) to preserve full autocomplete
  const isOpenCode = agent === "opencode";
  const commandsToInstall = isOpenCode ? readdirSync(COMMANDS_SRC).filter(f => f.endsWith('.md')) : MAIN_COMMANDS;

  for (const cmdPath of cfg.commandPaths) {
    try {
      installCommands(commandsToInstall, cmdPath, dryRun, agent);
      ok = true;
    } catch (e: any) {
      console.error(`  ✗ Failed commands install at ${cmdPath}: ${e.message}`);
    }
  }

  // Install to workflowPaths for Windsurf/Antigravity style
  if (cfg.workflowPaths) {
    for (const wfPath of cfg.workflowPaths) {
      try {
        installCommands(commandsToInstall, wfPath, dryRun, agent);
        ok = true;
      } catch (e: any) {
        console.error(`  ✗ Failed workflow install at ${wfPath}: ${e.message}`);
      }
    }
  }

  // MCP for Cursor
  if (agent === "cursor" && cfg.mcpPath) {
    const cursorOk = installForCursor(dryRun);
    ok = ok || cursorOk;
  }

  return ok;
}

function installForCursor(dryRun: boolean): boolean {
  const cursorDir = join(homedir(), ".cursor");
  if (!existsSync(cursorDir)) {
    console.log("  ~ Cursor not found (no ~/.cursor/) — skipping MCP, but commands may still install");
    // Don't fail, because command install may have succeeded
    return false;
  }

  const mcpPath = join(cursorDir, "mcp.json");
  let mcpConfig: any = { mcpServers: {} };

  if (existsSync(mcpPath)) {
    try {
      const raw = readFileSync(mcpPath, "utf-8");
      if (raw.trim().length > 0) {
        mcpConfig = JSON.parse(raw);
      }
    } catch (e: any) {
      console.error(`  ✗ Cursor mcp.json is corrupted (${e.message}) — backing up and recreating`);
      if (!dryRun) {
        try {
          const bak = `${mcpPath}.bak.${Date.now()}`;
          copyFileSync(mcpPath, bak);
          console.log(`  ↳ Backup saved to ${bak}`);
        } catch {}
      }
      mcpConfig = { mcpServers: {} };
    }
  }

  if (mcpConfig.mcpServers?.["cyberaudit-skill"]) {
    console.log(`  ✓ Cursor MCP already configured (${mcpPath})`);
    return true;
  }

  if (dryRun) {
    console.log(`  → Would add Cursor MCP entry to ${mcpPath}`);
    return true;
  }

  if (existsSync(mcpPath)) {
    try {
      const bak = `${mcpPath}.bak`;
      copyFileSync(mcpPath, bak);
    } catch {}
  }

  mcpConfig.mcpServers = mcpConfig.mcpServers || {};
  mcpConfig.mcpServers["cyberaudit-skill"] = {
    command: "npx",
    args: ["-y", "cyberaudit-skill", "serve"],
  };
  try {
    mkdirSync(dirname(mcpPath), { recursive: true });
    writeFileSync(mcpPath, JSON.stringify(mcpConfig, null, 2));
    console.log(`  ✓ Added Cursor MCP entry to ${mcpPath}`);
    return true;
  } catch (e: any) {
    console.error(`  ✗ Failed to write Cursor MCP config: ${e.message}`);
    return false;
  }
}

async function main() {
  const program = new Command();

  program
    .name("cyberaudit-skill")
    .description("CyberAudit Skill — universal security audit skill for AI agents (22 agents supported, like ui-ux-pro)")
    .version(VERSION);

  program
    .command("install")
    .description("Install CyberAudit Skill for AI agent(s) — supports 22 agents like ui-ux-pro-max-skill")
    .option("-a, --agent <agent>", "Target: opencode, claude-code, cursor, windsurf, copilot, kiro, codex, qoder, roocode, gemini, trae, continue, codebuddy, droid, kilocode, warp, augment, codewhale, cline, aider, or all", "all")
    .option("--dry-run", "Show changes without applying", false)
    .action((options) => {
      const dryRun = !!options.dryRun;
      const agentOpt = (options.agent || "all").toLowerCase();

      let agents: Agent[];
      if (agentOpt === "all") {
        const byFolder = detectByHomeFolders();
        const byLegacy = detectInstalledAgents();
        agents = [...new Set([...byFolder, ...byLegacy])] as Agent[];
        if (agents.length === 0) {
          console.log("No supported AI agents detected. Checked:");
          console.log("  ~/.claude, ~/.cursor, ~/.windsurf, ~/.agent, ~/.copilot, ~/.kiro, ~/.codex, ~/.qoder, ~/.roo, ~/.gemini, ~/.trae, ~/.agents, ~/.continue, ~/.codebuddy, ~/.factory, ~/.kilocode, ~/.warp, ~/.augment, ~/.codewhale, ~/.cline, ~/.aider");
          console.log("\nTry: --agent opencode  or  --agent claude-code  or  --agent all");
          console.log("\nOr install manually: copy skills/cyberaudit to <agent>/skills/");
          process.exit(1);
        }
        console.log(`Detected agents (${agents.length}): ${agents.join(", ")}`);
      } else {
        const valid = Object.keys(AGENT_CONFIG) as Agent[];
        if (!valid.includes(agentOpt as Agent)) {
          console.error(`Unknown agent: "${agentOpt}". Valid: ${valid.join(", ")}, all`);
          process.exit(1);
        }
        agents = [agentOpt as Agent];
      }

      const label = dryRun ? " (dry run)" : "";
      console.log(`\n═══ CyberAudit v${VERSION} Installation${label} — ${agents.length} agents — like ui-ux-pro ═══\n`);
      console.log(`Main commands for "/" menu: ${MAIN_COMMANDS.map(f=>f.replace('.md','')).join(', ')}\n`);

      let ok = 0, fail = 0;
      for (const agent of agents) {
        const cfg = AGENT_CONFIG[agent];
        console.log(`\n→ ${cfg.displayName} (${agent}):`);
        if (installSkillForAgent(agent, dryRun)) ok++; else fail++;
      }

      console.log(`\nDone. ${ok} configured, ${fail} skipped/failed.\n`);
      if (!dryRun && ok > 0) {
        console.log(`Verify: npx -y cyberaudit-skill list`);
        console.log(`Tip: Type "/" in your agent — you should see: ${MAIN_COMMANDS.slice(0,4).map(f=>'/'+f.replace('.md','').replace('audit-','audit:')).join(', ')}... (${MAIN_COMMANDS.length} commands)`);
        console.log();
      }
    });

  program
    .command("list")
    .description("List audits and installed agents (22 agents)")
    .action(() => {
      console.log(`\n═══ CyberAudit v${VERSION} — Available Audits ═══\n`);
      console.log("  cyberaudit-web       OWASP web app security audit");
      console.log("  cyberaudit-mobile    OWASP mobile app security audit");
      console.log("  cyberaudit-api       API security audit (REST/GraphQL/WS)");
      console.log("  cyberaudit-cloud     Cloud config audit (S3, IAM, SG, storage)");
      console.log("  cyberaudit-full      Full stack (web + API + cloud)");
      console.log("  cyberaudit-quick     Quick vulnerability scan (secrets + criticals) — deterministic\n");
      console.log(`═══ Supported Agents (${Object.keys(AGENT_CONFIG).length}) — like ui-ux-pro-max-skill ═══\n`);
      for (const [agentKey, cfg] of Object.entries(AGENT_CONFIG) as [Agent, AgentConfig][]) {
        let installed = false;
        let loc = "";
        // Check skill paths
        for (const sp of cfg.skillPaths) {
          if (existsSync(sp)) { installed = true; loc = sp; break; }
        }
        // Check command paths if not found
        if (!installed) {
          for (const cp of cfg.commandPaths) {
            if (existsSync(cp)) {
              const files = readdirSync(cp).filter(f => f.startsWith('audit'));
              if (files.length > 0) { installed = true; loc = `${cp} (${files.length} cmds)`; break; }
            }
          }
        }
        // Check MCP for cursor
        if (!installed && cfg.mcpPath && existsSync(cfg.mcpPath)) {
          try {
            if (readFileSync(cfg.mcpPath, 'utf-8').includes('cyberaudit-skill')) {
              installed = true;
              loc = cfg.mcpPath;
            }
          } catch {}
        }
        console.log(`  ${installed ? "✓" : "✗"} ${cfg.displayName.padEnd(20)} (${agentKey})${installed ? ` — ${loc}` : ""}`);
      }
      console.log(`\nMain "/" commands: ${MAIN_COMMANDS.map(f=>f.replace('.md','')).join(', ')}`);
      console.log(`Total commands available: ${readdirSync(COMMANDS_SRC).length} (8 main shown on "/")\n`);
    });

  program
    .command("scan")
    .description("Deterministic security scan (secrets, web vulns) — no LLM needed")
    .argument("[target]", "Path to scan", ".")
    .option("--json", "Output JSON instead of text", false)
    .option("--type <type>", "Scan type: secrets, web, all", "all")
    .option("--ignore <patterns>", "Comma-separated ignore patterns", "")
    .action((target, options) => {
      const scanTarget = resolve(target || ".");
      const ignore = options.ignore ? options.ignore.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
      const type = (options.type || 'all').toLowerCase();
      console.error(`[CyberAudit] Scanning ${scanTarget} [type=${type}]... (${VERSION})`);

      try {
        let allFindings: any[] = [];
        let secretFindings: any[] = [];
        let webFindings: any[] = [];

        if (type === 'secrets' || type === 'all') {
          secretFindings = scanSecrets(scanTarget, { ignore });
          allFindings.push(...secretFindings.map(f => ({ ...f, scanner: 'secrets' })));
        }
        if (type === 'web' || type === 'all') {
          webFindings = scanWeb(scanTarget);
          allFindings.push(...webFindings.map(f => ({ ...f, scanner: 'web' })));
        }

        if (options.json) {
          console.log(JSON.stringify({ target: scanTarget, version: VERSION, type, findings: allFindings }, null, 2));
        } else {
          if (type === 'secrets' || type === 'all') {
            console.log(formatFindingsText(secretFindings, scanTarget));
          }
          if (type === 'web' || type === 'all') {
            console.log(formatWebFindingsText(webFindings, scanTarget));
          }
          if (allFindings.length > 0) {
            console.log(`\n💡 Next: run full audit with /audit:secrets, /audit:web or /audit for context-aware review.`);
          } else {
            console.log(`\n✅ No deterministic findings for type=${type} in ${scanTarget}`);
          }
        }
        const hasCritical = allFindings.some(f => f.severity === 'CRITICAL');
        if (hasCritical) process.exitCode = 1;
      } catch (e: any) {
        console.error(`[CyberAudit] Scan failed: ${e.message}`);
        process.exit(1);
      }
    });

  program
    .command("report")
    .description("Generate deterministic security report from scan results")
    .argument("[target]", "Target path or app name", ".")
    .option("--input <file>", "JSON file from scan --json (if omitted, scans target)")
    .option("--type <type>", "Report type: web|api|mobile|cloud|full", "web")
    .option("--framework <fw>", "Framework name (e.g., Express, Next.js, Laravel)")
    .option("--output <file>", "Output markdown file (default: stdout)")
    .option("--json", " Also emit JSON summary to stderr", false)
    .action(async (target, options) => {
      const { generateReport } = await import("./report/generator.js");
      let findings: any[] = [];
      let scanTarget = target || ".";
      const reportType = (options.type || 'web').toLowerCase();

      if (options.input) {
        const inputPath = resolve(options.input);
        if (!existsSync(inputPath)) {
          console.error(`Input file not found: ${inputPath}`);
          process.exit(1);
        }
        const raw = readFileSync(inputPath, 'utf-8');
        const parsed = JSON.parse(raw);
        findings = parsed.findings || parsed;
        scanTarget = parsed.target || scanTarget;
      } else {
        console.error(`[CyberAudit] No input file, running scan on ${scanTarget}...`);
        const secrets = scanSecrets(resolve(scanTarget));
        const web = scanWeb(resolve(scanTarget));
        findings = [...secrets.map(f=>({...f, scanner:'secrets'})), ...web.map(f=>({...f, scanner:'web'}))];
      }

      const report = generateReport({
        target: scanTarget,
        version: VERSION,
        type: reportType as any,
        findings,
        framework: options.framework,
      });

      if (options.output) {
        const outPath = resolve(options.output);
        writeFileSync(outPath, report.markdown, 'utf-8');
        console.error(`[CyberAudit] Report written to ${outPath} | Score ${report.score}/100 ${report.verdict}`);
      } else {
        console.log(report.markdown);
      }

      if (options.json) {
        console.error(JSON.stringify({ score: report.score, verdict: report.verdict, dashboard: report.dashboard, owasp: report.owaspCompliance }, null, 2));
      }

      if (report.verdict === 'CRITICAL' || report.verdict === 'HIGH') process.exitCode = 1;
    });

  program
    .command("serve")
    .description("Start CyberAudit MCP server (stdio)")
    .action(() => {
      console.error(`[CyberAudit] MCP server starting v${VERSION}...`);
      startMcpServerImpl();
    });

  program.parse(process.argv);
}

main().catch((err) => {
  console.error("[CyberAudit] Fatal error:", err);
  process.exit(1);
});
