#!/usr/bin/env node

import { Command } from "commander";
import { existsSync, mkdirSync, cpSync, readdirSync, writeFileSync, readFileSync, rmSync, unlinkSync, copyFileSync } from "fs";
import { homedir } from "os";
import { join, dirname, resolve, relative } from "path";
import { fileURLToPath } from "url";
import { openSync, readSync, closeSync, statSync } from "fs";

function isBinaryFile(path: string): boolean {
  if (!existsSync(path)) return false;
  const stat = statSync(path);
  if (!stat.isFile()) return false;
  const buffer = Buffer.alloc(512);
  let fd;
  try {
    fd = openSync(path, 'r');
    const bytesRead = readSync(fd, buffer, 0, 512, 0);
    closeSync(fd);
    for (let i = 0; i < bytesRead; i++) {
      if (buffer[i] === 0) return true;
    }
  } catch { return false; }
  return false;
}

import { startMcpServer as startMcpServerImpl } from "./mcp-server.js";
import { scanSecrets, formatFindingsText } from "./scanners/secrets.js";
import { scanWeb, formatWebFindingsText } from "./scanners/web.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = join(__dirname, "..");
const PKG = JSON.parse(readFileSync(join(PKG_ROOT, "package.json"), "utf-8"));
const SKILL_SRC = join(PKG_ROOT, "skills", "cyberaudit");
const COMMANDS_SRC = join(SKILL_SRC, "commands");
const VERSION = PKG.version || "3.1.5";

const MAIN_COMMANDS = [
  'audit.md',
  'audit-web.md',
  'audit-mobile.md',
  'audit-api.md',
  'audit-cloud.md',
  'audit-quick.md',
  'audit-report.md',
  'audit-help.md',
];

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
  skillPaths: string[];
  commandPaths: string[];
  workflowPaths?: string[];
  mcpPath?: string;
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

export const AGENT_TARGETS: Record<string, string[]> = Object.fromEntries(
  Object.entries(AGENT_CONFIG).map(([k, v]) => [k, v.skillPaths])
);

function isSafeInsideHome(p: string): boolean {
  const home = resolve(H);
  const resolved = resolve(p);
  return resolved.startsWith(home);
}

function isSafeInsideCwd(p: string, cwd: string): boolean {
  return resolve(p).startsWith(resolve(cwd));
}

function isSafeSkillPath(p: string, mode: 'global' | 'local' = 'global', cwd = process.cwd()): boolean {
  const validPaths = new Set<string>();
  for (const agentKey of Object.keys(AGENT_CONFIG) as Agent[]) {
    const cfg = getPathsForMode(agentKey, mode, cwd);
    cfg.skillPaths.forEach(sp => validPaths.add(resolve(sp)));
  }
  return validPaths.has(resolve(p));
}

function isSafeCommandPath(p: string, mode: 'global' | 'local' = 'global', cwd = process.cwd()): boolean {
  const validPaths = new Set<string>();
  for (const agentKey of Object.keys(AGENT_CONFIG) as Agent[]) {
    const cfg = getPathsForMode(agentKey, mode, cwd);
    cfg.commandPaths.forEach(cp => validPaths.add(resolve(cp)));
    if (cfg.workflowPaths) cfg.workflowPaths.forEach(wp => validPaths.add(resolve(wp)));
  }
  return validPaths.has(resolve(p));
}

function toLocalPath(globalPath: string, cwd: string): string {
  // ~/.claude/skills/cyberaudit -> ./.claude/skills/cyberaudit
  try {
    const rel = relative(H, globalPath);
    if (rel.startsWith('..')) return join(cwd, globalPath.split('/').pop() || '');
    return join(cwd, rel);
  } catch {
    return join(cwd, '.' + globalPath.split('/').pop()!);
  }
}

function getPathsForMode(agent: Agent, mode: 'global' | 'local', cwd = process.cwd()): AgentConfig {
  const cfg = AGENT_CONFIG[agent];
  if (mode === 'global') return cfg;
  // local: transform each path to be relative to cwd
  return {
    displayName: cfg.displayName,
    skillPaths: cfg.skillPaths.map(p => toLocalPath(p, cwd)),
    commandPaths: cfg.commandPaths.map(p => toLocalPath(p, cwd)),
    workflowPaths: cfg.workflowPaths?.map(p => toLocalPath(p, cwd)),
    mcpPath: cfg.mcpPath ? toLocalPath(cfg.mcpPath, cwd) : undefined,
  };
}

function detectInstalledAgents(): Agent[] {
  const found: Agent[] = [];
  for (const [agent, cfg] of Object.entries(AGENT_CONFIG) as [Agent, AgentConfig][]) {
    const checkPaths = [
      ...cfg.skillPaths.map(p => dirname(p)),
      ...cfg.commandPaths.map(p => p),
      ...(cfg.workflowPaths || []).map(p => p),
      ...(cfg.mcpPath ? [dirname(cfg.mcpPath)] : []),
    ];
    if (checkPaths.some(parent => existsSync(parent))) {
      found.push(agent);
    }
  }
  if (existsSync(j(".agents")) && !found.includes("opencode")) found.push("opencode");
  if (existsSync(j(".claude")) && !found.includes("claude-code")) found.push("claude-code");
  if (existsSync(j(".cursor")) && !found.includes("cursor")) found.push("cursor");
  return [...new Set(found)];
}

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
  if (existsSync(j(".config", "opencode")) && !found.includes("opencode")) found.push("opencode");
  return found;
}

function installDir(src: string, dst: string, mode: 'global' | 'local' = 'global', cwd = process.cwd(), allowCommandPath = false): void {
  if (!existsSync(src)) throw new Error(`Source not found: ${src}`);
  const safeCheck = allowCommandPath
    ? (p: string) => isSafeCommandPath(p, mode, cwd)
    : (p: string) => isSafeSkillPath(p, mode, cwd);
  if (!safeCheck(dst)) {
    console.error(`✗ Unsafe destination blocked: ${dst} (mode=${mode})`);
    throw new Error(`Unsafe path: ${dst}`);
  }
  if (existsSync(dst)) {
    console.log(`  ♻️  Cleaning previous install at ${dst}`);
    rmSync(dst, { recursive: true, force: true });
  }
  mkdirSync(dirname(dst), { recursive: true });
  cpSync(src, dst, { recursive: true });
}

function installCommands(commandFiles: string[], targetDir: string, dryRun: boolean, agentName: string, mode: 'global' | 'local' = 'global', cwd = process.cwd()): void {
  if (!isSafeCommandPath(targetDir, mode, cwd)) {
    console.error(`  ✗ Unsafe command destination blocked: ${targetDir}`);
    return;
  }
  if (dryRun) {
    console.log(`  → Would install ${commandFiles.length} commands to ${targetDir} (--dry-run) [${mode}]`);
    return;
  }
  mkdirSync(targetDir, { recursive: true });
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

  for (const fileName of commandFiles) {
    const src = join(COMMANDS_SRC, fileName);
    if (!existsSync(src)) continue;
    const dst = join(targetDir, fileName);
    try {
      mkdirSync(dirname(dst), { recursive: true });
      copyFileSync(src, dst);
    } catch (e: any) {
      console.error(`  ✗ Failed to copy command ${fileName} to ${targetDir}: ${e.message}`);
    }
  }

  // Copy shared directory so commands loading shared/... work
  const sharedSrc = join(SKILL_SRC, "shared");
  const sharedDst = join(targetDir, "shared");
  if (existsSync(sharedSrc) && !dryRun) {
    try {
      if (existsSync(sharedDst)) rmSync(sharedDst, { recursive: true, force: true });
      mkdirSync(dirname(sharedDst), { recursive: true });
      cpSync(sharedSrc, sharedDst, { recursive: true });
    } catch {}
  }

  console.log(`  ✓ Commands (${commandFiles.length}) installed to ${agentName} (${targetDir}) [${mode}] — "/" will show ${commandFiles.length} main commands`);
}

function installSkillForAgent(agent: Agent, dryRun: boolean, mode: 'global' | 'local' = 'global', cwd = process.cwd()): boolean {
  const cfg = getPathsForMode(agent, mode, cwd);
  if (!cfg) return false;
  if (!existsSync(SKILL_SRC)) {
    console.error(`✗ Skill source not found at ${SKILL_SRC}.`);
    return false;
  }

  if (dryRun) {
    for (const sp of cfg.skillPaths) console.log(`  → Would install skill to ${sp} (--dry-run) [${mode}]`);
    for (const cp of cfg.commandPaths) console.log(`  → Would install ${MAIN_COMMANDS.length} main commands to ${cp} (--dry-run) [${mode}]`);
    if (cfg.workflowPaths) for (const wp of cfg.workflowPaths) console.log(`  → Would install ${MAIN_COMMANDS.length} workflows to ${wp} (--dry-run) [${mode}]`);
    if (cfg.mcpPath) console.log(`  → Would configure MCP at ${cfg.mcpPath} (--dry-run) [${mode}]`);
    return true;
  }

  let ok = false;
  for (const skillPath of cfg.skillPaths) {
    try {
      installDir(SKILL_SRC, skillPath, mode, cwd, false);
      console.log(`  ✓ Skill installed at ${skillPath} [${mode}]`);
      ok = true;
    } catch (e: any) {
      console.error(`  ✗ Failed skill install at ${skillPath}: ${e.message}`);
    }
  }

  const isOpenCode = agent === "opencode";
  const commandsToInstall = isOpenCode ? readdirSync(COMMANDS_SRC).filter(f => f.endsWith('.md')) : MAIN_COMMANDS;

  for (const cmdPath of cfg.commandPaths) {
    try {
      installCommands(commandsToInstall, cmdPath, dryRun, agent, mode, cwd);
      ok = true;
    } catch (e: any) {
      console.error(`  ✗ Failed commands install at ${cmdPath}: ${e.message}`);
    }
  }

  if (cfg.workflowPaths) {
    for (const wfPath of cfg.workflowPaths) {
      try {
        installCommands(commandsToInstall, wfPath, dryRun, agent, mode, cwd);
        ok = true;
      } catch {}
    }
  }

  if (agent === "cursor") {
    const cursorOk = installForCursor(dryRun, mode, cwd);
    ok = ok || cursorOk;
  }

  return ok;
}

function installForCursor(dryRun: boolean, mode: 'global' | 'local' = 'global', cwd = process.cwd()): boolean {
  const baseDir = mode === 'local' ? cwd : H;
  const cursorDir = mode === 'local' ? join(cwd, ".cursor") : join(H, ".cursor");
  // For local, .cursor folder may not exist, but we should still create mcp.json
  if (mode === 'global' && !existsSync(cursorDir)) {
    console.log("  ~ Cursor not found (no ~/.cursor/) — skipping MCP, but commands may still install");
    return false;
  }

  const mcpPath = join(cursorDir, "mcp.json");
  let mcpConfig: any = { mcpServers: {} };

  if (existsSync(mcpPath)) {
    try {
      if (isBinaryFile(mcpPath)) {
        throw new Error("File is binary (corrupted)");
      }
      const raw = readFileSync(mcpPath, "utf-8");
      if (raw.trim().length > 0) mcpConfig = JSON.parse(raw);
    } catch (e: any) {
      console.error(`  ✗ Cursor mcp.json is corrupted (${e.message}) — backing up`);
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
    console.log(`  ✓ Cursor MCP already configured (${mcpPath}) [${mode}]`);
    return true;
  }

  if (dryRun) {
    console.log(`  → Would add Cursor MCP entry to ${mcpPath} [${mode}]`);
    return true;
  }

  if (existsSync(mcpPath)) {
    try { copyFileSync(mcpPath, `${mcpPath}.bak`); } catch {}
  }

  mcpConfig.mcpServers = mcpConfig.mcpServers || {};
  mcpConfig.mcpServers["cyberaudit-skill"] = {
    command: "npx",
    args: ["-y", "cyberaudit-skill", "serve"],
  };
  try {
    mkdirSync(dirname(mcpPath), { recursive: true });
    writeFileSync(mcpPath, JSON.stringify(mcpConfig, null, 2));
    console.log(`  ✓ Added Cursor MCP entry to ${mcpPath} [${mode}]`);
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
    .description("CyberAudit Skill — 22 agents like ui-ux-pro-max-skill, 8 main commands on '/'")
    .version(VERSION);

  program
    .command("install")
    .description("Install CyberAudit Skill for AI agent(s) — supports 22 agents like ui-ux-pro-max-skill, with --global and --local modes")
    .option("-a, --agent <agent>", "Target agent or all", "all")
    .option("--dry-run", "Show changes without applying", false)
    .option("--global", "Install globally to ~/ (default)", false)
    .option("--local", "Install locally to ./ (project) like ui-ux-pro — ensures '/' shows commands", false)
    .action((options) => {
      const dryRun = !!options.dryRun;
      const agentOpt = (options.agent || "all").toLowerCase();
      // Determine mode: if --local flag, local; else if --global or no flag, global (backward compat)
      let mode: 'global' | 'local' = 'global';
      if (options.local) mode = 'local';
      else if (options.global) mode = 'global';
      // If neither, default global for backward compat, but hint about local
      const cwd = process.cwd();

      let agents: Agent[];
      if (agentOpt === "all") {
        if (mode === 'local') {
          // For local, install to all agents in project (like ui-ux-pro init --ai all)
          agents = Object.keys(AGENT_CONFIG) as Agent[];
          console.log(`Installing locally to project ${cwd} for all ${agents.length} agents (like ui-ux-pro)`);
        } else {
          const byFolder = detectByHomeFolders();
          const byLegacy = detectInstalledAgents();
          agents = [...new Set([...byFolder, ...byLegacy])] as Agent[];
          if (agents.length === 0) {
            console.log("No supported AI agents detected globally. Checked:");
            console.log("  ~/.claude, ~/.cursor, ~/.windsurf, ~/.agent, ~/.copilot, ~/.kiro, ~/.codex, ~/.qoder, ~/.roo, ~/.gemini, ~/.trae, ~/.agents, ~/.continue, ~/.codebuddy, ~/.factory, ~/.kilocode, ~/.warp, ~/.augment, ~/.codewhale, ~/.cline, ~/.aider");
            console.log("\nTry: --agent claude-code --local  (project-local, ensures '/' shows)");
            console.log("Or: --agent all --local  (like ui-ux-pro init --ai all)");
            process.exit(1);
          }
          console.log(`Detected agents (${agents.length}): ${agents.join(", ")} [global mode]`);
        }
      } else {
        const valid = Object.keys(AGENT_CONFIG) as Agent[];
        if (!valid.includes(agentOpt as Agent)) {
          console.error(`Unknown agent: "${agentOpt}". Valid: ${valid.join(", ")}, all`);
          process.exit(1);
        }
        agents = [agentOpt as Agent];
      }

      const label = dryRun ? " (dry run)" : "";
      console.log(`\n═══ CyberAudit v${VERSION} Installation${label} — ${agents.length} agents [${mode}] — like ui-ux-pro ═══\n`);
      console.log(`Main commands for "/" menu: ${MAIN_COMMANDS.map(f=>f.replace('.md','')).join(', ')}\n`);
      if (mode === 'local') console.log(`Project: ${cwd}\n`);

      let ok = 0, fail = 0;
      for (const agent of agents) {
        const cfg = getPathsForMode(agent, mode, cwd);
        console.log(`\n→ ${cfg.displayName} (${agent}) [${mode}]:`);
        if (installSkillForAgent(agent, dryRun, mode, cwd)) ok++; else fail++;
      }

      console.log(`\nDone. ${ok} configured, ${fail} skipped/failed [${mode}].\n`);
      if (!dryRun && ok > 0) {
        console.log(`Verify: npx -y cyberaudit-skill list${mode==='local' ? ' --local' : ''}`);
        console.log(`Tip: Type "/" in your agent — you should see: ${MAIN_COMMANDS.slice(0,4).map(f=>'/'+f.replace('.md','').replace('audit-','audit:')).join(', ')}... (${MAIN_COMMANDS.length} commands) [${mode}]\n`);
        if (mode === 'global') {
          console.log(`For 100% guarantee like ui-ux-pro, also run: npx -y cyberaudit-skill install --agent all --local\n`);
        }
      }
    });

  program
    .command("list")
    .description("List audits and installed agents (22 agents)")
    .option("--local", "List project-local installation (./) instead of global (~/)", false)
    .action((opts) => {
      const mode = opts.local ? 'local' as const : 'global' as const;
      const cwd = process.cwd();
      console.log(`\n═══ CyberAudit v${VERSION} — Available Audits [${mode}] ═══\n`);
      console.log("  cyberaudit-web       OWASP web app security audit");
      console.log("  cyberaudit-mobile    OWASP mobile app security audit");
      console.log("  cyberaudit-api       API security audit");
      console.log("  cyberaudit-cloud     Cloud config audit");
      console.log("  cyberaudit-full      Full stack");
      console.log("  cyberaudit-quick     Quick scan (deterministic)\n");
      console.log(`═══ Supported Agents (${Object.keys(AGENT_CONFIG).length}) [${mode}] ═══\n`);
      for (const [agentKey, cfgGlobal] of Object.entries(AGENT_CONFIG) as [Agent, AgentConfig][]) {
        const cfg = getPathsForMode(agentKey, mode, cwd);
        let installed = false;
        let loc = "";
        for (const sp of cfg.skillPaths) {
          if (existsSync(sp)) { installed = true; loc = sp; break; }
        }
        if (!installed) {
          for (const cp of cfg.commandPaths) {
            if (existsSync(cp)) {
              try {
                const files = readdirSync(cp).filter(f => f.startsWith('audit'));
                if (files.length > 0) { installed = true; loc = `${cp} (${files.length} cmds)`; break; }
              } catch {}
            }
          }
        }
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
      console.log(`\nMain "/" commands: ${MAIN_COMMANDS.map(f=>f.replace('.md','')).join(', ')} [${mode}]`);
      console.log(`Total commands available: ${readdirSync(COMMANDS_SRC).length} (8 main shown on "/")\n`);
    });

  program
    .command("uninstall")
    .description("Uninstall CyberAudit Skill")
    .option("-a, --agent <agent>", "Target agent or all", "all")
    .option("--global", "Uninstall globally", false)
    .option("--local", "Uninstall locally", false)
    .action((options) => {
      const dryRun = false;
      const agentOpt = (options.agent || "all").toLowerCase();
      let mode: 'global' | 'local' = 'global';
      if (options.local) mode = 'local';
      else if (options.global) mode = 'global';
      const cwd = process.cwd();
      const agents = agentOpt === "all" ? (Object.keys(AGENT_CONFIG) as Agent[]) : [agentOpt as Agent];
      
      console.log(`\n═══ CyberAudit Uninstall — ${agents.length} agents [${mode}] ═══\n`);
      for (const agent of agents) {
        const cfg = getPathsForMode(agent, mode, cwd);
        console.log(`→ Uninstalling ${cfg.displayName} [${mode}]...`);
        let uninstalled = false;
        
        for (const sp of cfg.skillPaths) {
          if (existsSync(sp)) {
            rmSync(sp, { recursive: true, force: true });
            console.log(`  ✓ Removed skill dir: ${sp}`);
            uninstalled = true;
          }
        }
        
        for (const cp of cfg.commandPaths) {
          if (existsSync(cp)) {
            try {
              const files = readdirSync(cp).filter(f => f.startsWith('audit') || f === 'shared');
              for (const f of files) {
                const p = join(cp, f);
                if (statSync(p).isDirectory()) rmSync(p, { recursive: true, force: true });
                else unlinkSync(p);
              }
              console.log(`  ✓ Removed commands from: ${cp}`);
              uninstalled = true;
            } catch {}
          }
        }

        if (cfg.workflowPaths) {
          for (const wp of cfg.workflowPaths) {
            if (existsSync(wp)) {
              try {
                const files = readdirSync(wp).filter(f => f.startsWith('audit') || f === 'shared');
                for (const f of files) {
                  const p = join(wp, f);
                  if (statSync(p).isDirectory()) rmSync(p, { recursive: true, force: true });
                  else unlinkSync(p);
                }
                console.log(`  ✓ Removed workflows from: ${wp}`);
                uninstalled = true;
              } catch {}
            }
          }
        }

        if (cfg.mcpPath && existsSync(cfg.mcpPath)) {
          try {
            if (isBinaryFile(cfg.mcpPath)) throw new Error("Binary mcp.json");
            const raw = readFileSync(cfg.mcpPath, 'utf-8');
            const parsed = JSON.parse(raw);
            if (parsed.mcpServers?.["cyberaudit-skill"]) {
              delete parsed.mcpServers["cyberaudit-skill"];
              copyFileSync(cfg.mcpPath, `${cfg.mcpPath}.bak`);
              writeFileSync(cfg.mcpPath, JSON.stringify(parsed, null, 2));
              console.log(`  ✓ Removed MCP config from: ${cfg.mcpPath}`);
              uninstalled = true;
            }
          } catch (e: any) {
            console.error(`  ✗ Failed to update mcp.json: ${e.message}`);
          }
        }
        
        if (!uninstalled) console.log(`  ~ Nothing to uninstall.`);
      }
      console.log(`\nDone.`);
    });

  program
    .command("doctor")
    .description("Check CyberAudit Skill installation status and environment health")
    .option("--local", "Check locally (project)", false)
    .action((options) => {
      let mode: 'global' | 'local' = options.local ? 'local' : 'global';
      const cwd = process.cwd();
      console.log(`\n═══ CyberAudit Doctor 🩺 [${mode}] ═══\n`);
      
      let healthy = true;
      console.log("Environment:");
      try {
        const nodeVer = process.version;
        console.log(`  ✓ Node.js: ${nodeVer}`);
      } catch {
        console.log(`  ✗ Node.js check failed`);
        healthy = false;
      }
      
      console.log("\nSkill Source:");
      if (existsSync(SKILL_SRC)) {
        console.log(`  ✓ Found: ${SKILL_SRC}`);
        const sharedSrc = join(SKILL_SRC, 'shared');
        if (existsSync(sharedSrc)) console.log(`  ✓ Shared logic: Present`);
        else { console.log(`  ✗ Shared logic: Missing`); healthy = false; }
      } else {
        console.log(`  ✗ Missing: ${SKILL_SRC}`);
        healthy = false;
      }

      console.log("\nInstallation Status:");
      let installedCount = 0;
      for (const [agentKey, _] of Object.entries(AGENT_CONFIG) as [Agent, any][]) {
        const cfg = getPathsForMode(agentKey, mode, cwd);
        let status = [];
        
        for (const sp of cfg.skillPaths) {
          if (existsSync(sp)) status.push("Skill Dir ✓");
        }
        
        let cmdCount = 0;
        for (const cp of cfg.commandPaths) {
          if (existsSync(cp)) {
            try {
              cmdCount += readdirSync(cp).filter(f => f.startsWith('audit') && f.endsWith('.md')).length;
              if (existsSync(join(cp, 'shared'))) status.push("Commands Shared ✓");
            } catch {}
          }
        }
        if (cmdCount > 0) status.push(`Commands (${cmdCount}) ✓`);

        if (cfg.mcpPath && existsSync(cfg.mcpPath)) {
          try {
            if (!isBinaryFile(cfg.mcpPath)) {
              const raw = readFileSync(cfg.mcpPath, 'utf-8');
              if (raw.includes('cyberaudit-skill')) status.push("MCP Config ✓");
            } else {
              status.push("MCP Config ✗ (Binary Corrupted)");
              healthy = false;
            }
          } catch {}
        }

        if (status.length > 0) {
          console.log(`  ${cfg.displayName}: ${status.join(', ')}`);
          installedCount++;
        }
      }
      if (installedCount === 0) console.log(`  No agents installed in [${mode}] mode.`);
      
      console.log(`\nSummary: ${healthy ? "✅ Healthy" : "❌ Issues Detected"}`);
    });

  program
    .command("scan")
    .description("Deterministic security scan (secrets, web vulns)")
    .argument("[target]", "Path to scan", ".")
    .option("--json", "Output JSON", false)
    .option("--type <type>", "Scan type: secrets, web, all", "all")
    .option("--ignore <patterns>", "Comma-separated ignore", "")
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
          if (type === 'secrets' || type === 'all') console.log(formatFindingsText(secretFindings, scanTarget));
          if (type === 'web' || type === 'all') console.log(formatWebFindingsText(webFindings, scanTarget));
          if (allFindings.length > 0) console.log(`\n💡 Next: /audit:secrets, /audit:web or /audit`);
          else console.log(`\n✅ No findings for type=${type} in ${scanTarget}`);
        }
        if (allFindings.some(f => f.severity === 'CRITICAL')) process.exitCode = 1;
      } catch (e: any) {
        console.error(`[CyberAudit] Scan failed: ${e.message}`);
        process.exit(1);
      }
    });

  program
    .command("report")
    .description("Generate deterministic security report")
    .argument("[target]", "Target path or app name", ".")
    .option("--input <file>", "JSON file from scan --json")
    .option("--type <type>", "Report type: web|api|mobile|cloud|full", "web")
    .option("--framework <fw>", "Framework name")
    .option("--output <file>", "Output markdown file")
    .option("--json", " Also emit JSON summary", false)
    .action(async (target, options) => {
      const { generateReport } = await import("./report/generator.js");
      let findings: any[] = [];
      let scanTarget = target || ".";
      const reportType = (options.type || 'web').toLowerCase();
      if (options.input) {
        const inputPath = resolve(options.input);
        if (!existsSync(inputPath)) { console.error(`Input file not found: ${inputPath}`); process.exit(1); }
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
      const report = generateReport({ target: scanTarget, version: VERSION, type: reportType as any, findings, framework: options.framework });
      if (options.output) {
        const outPath = resolve(options.output);
        writeFileSync(outPath, report.markdown, 'utf-8');
        console.error(`[CyberAudit] Report written to ${outPath} | Score ${report.score}/100 ${report.verdict}`);
      } else console.log(report.markdown);
      if (options.json) console.error(JSON.stringify({ score: report.score, verdict: report.verdict, dashboard: report.dashboard, owasp: report.owaspCompliance }, null, 2));
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
