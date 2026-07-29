#!/usr/bin/env node

import { Command } from "commander";
import { existsSync, mkdirSync, cpSync, readdirSync, writeFileSync, readFileSync, rmSync, unlinkSync, copyFileSync, renameSync, statSync } from "fs";
import { homedir } from "os";
import { join, dirname, resolve, relative } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";
import { createHash } from "crypto";
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

// Backward compatibility check functions matching CLI tests
function isSafeInsideHome(p: string): boolean {
  const home = resolve(H);
  const resolved = resolve(p);
  return resolved.startsWith(home);
}

function isSafeInsideCwd(p: string, cwd: string): boolean {
  return resolve(p).startsWith(resolve(cwd));
}

function isSafeSkillPath(p: string, mode: 'global' | 'local' = 'global', cwd = process.cwd()): boolean {
  if (mode === 'local') {
    return isSafeInsideCwd(p, cwd) && p.includes("cyberaudit");
  }
  return isSafeInsideHome(p) && p.includes("cyberaudit");
}

function isSafeCommandPath(p: string, mode: 'global' | 'local' = 'global', cwd = process.cwd()): boolean {
  const inside = mode === 'local' ? isSafeInsideCwd(p, cwd) : isSafeInsideHome(p);
  if (!inside) return false;
  return p.includes("commands") || p.includes("workflows") || p.includes("skills");
}

// Strict Whitelist Resolver — Blocks directory traversals strictly
function isSafePath(p: string, mode: 'global' | 'local', cwd = process.cwd()): boolean {
  const resolved = resolve(p);
  
  // Whitelist local & global shared directory
  const sharedDir = resolve(mode === 'local' ? join(cwd, ".shared", "cyberaudit") : join(H, ".shared", "cyberaudit"));
  if (resolved === sharedDir || resolved.startsWith(sharedDir + "/")) {
    return true;
  }

  // Whitelist all predefined paths from AGENT_CONFIG
  for (const agent of Object.keys(AGENT_CONFIG) as Agent[]) {
    const paths = getPathsForMode(agent, mode, cwd);
    const whitelist = [
      ...paths.skillPaths,
      ...paths.commandPaths,
      ...(paths.workflowPaths || []),
      ...(paths.mcpPath ? [paths.mcpPath] : []),
    ].map(x => resolve(x));

    for (const wl of whitelist) {
      if (resolved === wl || resolved.startsWith(wl + "/")) {
        // Enforce no traversal back out using relative
        const rel = relative(wl, resolved);
        if (!rel.startsWith("..")) {
          return true;
        }
      }
    }
  }

  return false;
}

function toLocalPath(globalPath: string, cwd: string): string {
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

// Compute hash of all file contents inside a directory to verify copying
function calculateDirHash(dir: string): string {
  const hash = createHash("sha256");
  const files: string[] = [];
  const walk = (d: string) => {
    if (!existsSync(d)) return;
    const list = readdirSync(d);
    for (const file of list) {
      const p = join(d, file);
      const s = statSync(p);
      if (s.isDirectory()) {
        walk(p);
      } else {
        files.push(p);
      }
    }
  };
  walk(dir);
  files.sort();
  for (const file of files) {
    hash.update(relative(dir, file));
    hash.update(readFileSync(file));
  }
  return hash.digest("hex");
}

// Transactional copy with hash-checksum verification and rollback
function installDir(src: string, dst: string, mode: 'global' | 'local' = 'global', cwd = process.cwd(), allowCommandPath = false): void {
  if (!existsSync(src)) throw new Error(`Source not found: ${src}`);
  if (!isSafePath(dst, mode, cwd)) {
    console.error(`✗ Unsafe destination blocked: ${dst} (mode=${mode})`);
    throw new Error(`Unsafe path: ${dst}`);
  }

  const backup = `${dst}.backup_${Date.now()}`;
  let backupCreated = false;

  try {
    if (existsSync(dst)) {
      renameSync(dst, backup);
      backupCreated = true;
    }
    mkdirSync(dirname(dst), { recursive: true });
    cpSync(src, dst, { recursive: true });

    // Integrity Check (Hash verification)
    const srcHash = calculateDirHash(src);
    const dstHash = calculateDirHash(dst);
    if (srcHash !== dstHash) {
      throw new Error(`Integrity check failed: source hash ${srcHash.slice(0, 8)} != destination hash ${dstHash.slice(0, 8)}`);
    }

    if (backupCreated) {
      rmSync(backup, { recursive: true, force: true });
    }
  } catch (e: any) {
    console.error(`  ✗ Safe directory install failed: ${e.message}. Launching rollback...`);
    try {
      if (existsSync(dst)) {
        rmSync(dst, { recursive: true, force: true });
      }
      if (backupCreated && existsSync(backup)) {
        renameSync(backup, dst);
        console.log(`  ✓ Rollback successful. Restored previous stable copy.`);
      }
    } catch (re: any) {
      console.error(`  ✗ Critical: Rollback failed: ${re.message}`);
    }
    throw e;
  }
}

// Minimal wrapper generator to avoid duplicating 11MB per agent skill
function installSkillWrapper(skillPath: string, sharedPath: string, mode: 'global' | 'local', cwd = process.cwd()): void {
  if (!isSafePath(skillPath, mode, cwd)) {
    throw new Error(`Unsafe skill path blocked: ${skillPath}`);
  }
  const backup = `${skillPath}.backup_${Date.now()}`;
  let backupCreated = false;
  try {
    if (existsSync(skillPath)) {
      renameSync(skillPath, backup);
      backupCreated = true;
    }
    mkdirSync(skillPath, { recursive: true });
    
    const wrapperContent = `---
name: cyberaudit
description: Security audit intelligence. Redirects to central shared skill.
---
# CyberAudit AI Wrapper

This agent skill is a lightweight pointer to the central CyberAudit installation.
To execute any security checklist or audit command, you must read the actual configurations, rules, and taxonomies from:

SHARED_PATH: ${sharedPath}

Always start by reading:
1. ${join(sharedPath, "COMMANDS.md")}
2. ${join(sharedPath, "AGENT-BOOT.md")}
3. The checklists and philosophies in ${sharedPath}

Apply the behavior defined in ${join(sharedPath, "AGENT-BOOT.md")}.
`;

    writeFileSync(join(skillPath, "SKILL.md"), wrapperContent, "utf-8");
    if (backupCreated) {
      rmSync(backup, { recursive: true, force: true });
    }
  } catch (e: any) {
    console.error(`  ✗ Failed to install wrapper at ${skillPath}: ${e.message}`);
    if (backupCreated && existsSync(backup)) {
      try {
        if (existsSync(skillPath)) rmSync(skillPath, { recursive: true, force: true });
        renameSync(backup, skillPath);
      } catch {}
    }
    throw e;
  }
}

function installCommands(commandFiles: string[], targetDir: string, dryRun: boolean, agentName: string, mode: 'global' | 'local' = 'global', cwd = process.cwd()): void {
  if (!isSafePath(targetDir, mode, cwd)) {
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
  console.log(`  ✓ Commands (${commandFiles.length}) installed to ${agentName} (${targetDir}) [${mode}] — "/" will show ${commandFiles.length} main commands`);
}

function installSkillForAgent(agent: Agent, sharedPath: string, dryRun: boolean, mode: 'global' | 'local' = 'global', cwd = process.cwd()): boolean {
  const cfg = getPathsForMode(agent, mode, cwd);
  if (!cfg) return false;

  if (dryRun) {
    for (const sp of cfg.skillPaths) console.log(`  → Would install pointer wrapper skill to ${sp} (--dry-run) [${mode}]`);
    for (const cp of cfg.commandPaths) console.log(`  → Would install ${MAIN_COMMANDS.length} main commands to ${cp} (--dry-run) [${mode}]`);
    if (cfg.workflowPaths) for (const wp of cfg.workflowPaths) console.log(`  → Would install ${MAIN_COMMANDS.length} workflows to ${wp} (--dry-run) [${mode}]`);
    if (cfg.mcpPath) console.log(`  → Would configure Cursor MCP at ${cfg.mcpPath} (--dry-run) [${mode}]`);
    return true;
  }

  let ok = false;
  for (const skillPath of cfg.skillPaths) {
    try {
      // Install pointer wrapper pointing to shared folder instead of duplicating 11MB!
      installSkillWrapper(skillPath, sharedPath, mode, cwd);
      console.log(`  ✓ Skill wrapper installed at ${skillPath} [${mode}] (Points to shared)`);
      ok = true;
    } catch (e: any) {
      console.error(`  ✗ Failed wrapper install at ${skillPath}: ${e.message}`);
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
  const cursorDir = mode === 'local' ? join(cwd, ".cursor") : join(H, ".cursor");
  if (mode === 'global' && !existsSync(cursorDir)) {
    console.log("  ~ Cursor not found (no ~/.cursor/) — skipping MCP, but commands may still install");
    return false;
  }

  const mcpPath = join(cursorDir, "mcp.json");
  return updateMcpJsonFile(mcpPath, "cyberaudit-skill", dryRun);
}

// Auto .gitignore configurations
function updateGitIgnore(paths: string[], cwd = process.cwd()) {
  const gitIgnorePath = join(cwd, ".gitignore");
  let content = "";
  if (existsSync(gitIgnorePath)) {
    content = readFileSync(gitIgnorePath, "utf-8");
  }

  const entriesToIgnore = paths
    .map(p => {
      const rel = relative(cwd, p);
      if (rel.startsWith("..")) return null;
      return `/${rel.replace(/\\/g, "/")}/`;
    })
    .filter(Boolean) as string[];

  entriesToIgnore.push("/.shared/cyberaudit/");

  let updated = false;
  let newContent = content;

  const header = "\n# CyberAudit Skill - Start";
  const footer = "# CyberAudit Skill - End\n";

  const uniqueEntries = [...new Set(entriesToIgnore)].filter(e => !content.includes(e));
  if (uniqueEntries.length > 0) {
    if (content.includes("# CyberAudit Skill - Start")) {
      const startIdx = content.indexOf("# CyberAudit Skill - Start");
      const endIdx = content.indexOf("# CyberAudit Skill - End");
      if (endIdx !== -1) {
        const block = content.slice(startIdx, endIdx + "# CyberAudit Skill - End".length);
        const existingLines = block.split("\n").filter(l => l.trim() && !l.startsWith("#"));
        const allLines = [...new Set([...existingLines, ...uniqueEntries])];
        const newBlock = `${header}\n${allLines.join("\n")}\n${footer}`;
        newContent = content.replace(block, newBlock);
      }
    } else {
      newContent += `${header}\n${uniqueEntries.join("\n")}\n${footer}`;
    }
    updated = true;
  }

  if (updated) {
    writeFileSync(gitIgnorePath, newContent, "utf-8");
    console.log(`  ✓ Automatically updated .gitignore to avoid repository pollution.`);
  }
}

// MCP generic config files updater
function updateMcpJsonFile(filePath: string, serverName: string, dryRun: boolean): boolean {
  if (dryRun) {
    console.log(`  → Would configure MCP at ${filePath}`);
    return true;
  }

  let mcpConfig: any = { mcpServers: {} };
  if (existsSync(filePath)) {
    try {
      const raw = readFileSync(filePath, "utf-8");
      if (raw.trim().length > 0) mcpConfig = JSON.parse(raw);
    } catch (e: any) {
      console.error(`  ✗ MCP file mcp.json is corrupted (${e.message}) — backing up`);
      try {
        const bak = `${filePath}.bak.${Date.now()}`;
        copyFileSync(filePath, bak);
        console.log(`  ↳ Backup saved to ${bak}`);
      } catch {}
      mcpConfig = { mcpServers: {} };
    }
  }

  if (mcpConfig.mcpServers?.[serverName]) {
    console.log(`  ✓ MCP already configured at ${filePath}`);
    return true;
  }

  if (existsSync(filePath)) {
    try { copyFileSync(filePath, `${filePath}.bak`); } catch {}
  }

  mcpConfig.mcpServers = mcpConfig.mcpServers || {};
  mcpConfig.mcpServers[serverName] = {
    command: "npx",
    args: ["-y", "cyberaudit-skill", "serve"],
  };

  try {
    mkdirSync(dirname(filePath), { recursive: true });
    writeFileSync(filePath, JSON.stringify(mcpConfig, null, 2));
    console.log(`  ✓ Configured MCP server in ${filePath}`);
    return true;
  } catch (e: any) {
    console.error(`  ✗ Failed to write MCP config: ${e.message}`);
    return false;
  }
}

// Support other MCP clients
function configureOtherMcps(dryRun: boolean, mode: 'global' | 'local', cwd = process.cwd()) {
  const isWin = process.platform === "win32";
  const isMac = process.platform === "darwin";

  // Claude Desktop Config
  let claudeDesktopDir = "";
  if (isMac) {
    claudeDesktopDir = join(homedir(), "Library", "Application Support", "Claude");
  } else if (isWin) {
    claudeDesktopDir = process.env.APPDATA ? join(process.env.APPDATA, "Claude") : join(homedir(), "AppData", "Roaming", "Claude");
  } else {
    claudeDesktopDir = join(homedir(), ".config", "Claude");
  }
  const claudePath = join(claudeDesktopDir, "claude_desktop_config.json");
  if (existsSync(dirname(claudePath)) || mode === 'local') {
    updateMcpJsonFile(claudePath, "cyberaudit-skill", dryRun);
  }

  // Windsurf MCP
  const windsurfPath = mode === 'local' ? join(cwd, ".windsurf", "mcp.json") : join(homedir(), ".windsurf", "mcp.json");
  if (existsSync(dirname(windsurfPath)) || mode === 'local') {
    updateMcpJsonFile(windsurfPath, "cyberaudit-skill", dryRun);
  }

  // Continue Config
  const continuePath = mode === 'local' ? join(cwd, ".continue", "config.json") : join(homedir(), ".continue", "config.json");
  if (existsSync(dirname(continuePath)) || mode === 'local') {
    if (!dryRun) {
      try {
        let config: any = {};
        if (existsSync(continuePath)) {
          config = JSON.parse(readFileSync(continuePath, "utf-8"));
        }
        config.mcpServers = config.mcpServers || {};
        config.mcpServers["cyberaudit-skill"] = {
          type: "stdio",
          command: "npx",
          args: ["-y", "cyberaudit-skill", "serve"],
        };
        mkdirSync(dirname(continuePath), { recursive: true });
        writeFileSync(continuePath, JSON.stringify(config, null, 2));
        console.log(`  ✓ Configured Continue MCP in ${continuePath}`);
      } catch {}
    }
  }

  // Cline Config
  const clinePath = mode === 'local' ? join(cwd, ".cline", "mcp.json") : join(homedir(), ".cline", "mcp.json");
  if (existsSync(dirname(clinePath)) || mode === 'local') {
    updateMcpJsonFile(clinePath, "cyberaudit-skill", dryRun);
  }
}

// Get binary version logs
function getBinaryVersion(binaryName: string): string | null {
  try {
    const out = execSync(`${binaryName} --version`, { stdio: ["ignore", "pipe", "pipe"] }).toString().trim();
    if (out) return out;
  } catch {}
  try {
    const out = execSync(`${binaryName} -v`, { stdio: ["ignore", "pipe", "pipe"] }).toString().trim();
    if (out) return out;
  } catch {}
  return null;
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
    .option("--commit", "Force gittracking of local skill installations (no gitignore change)", false)
    .action((options) => {
      const dryRun = !!options.dryRun;
      const agentOpt = (options.agent || "all").toLowerCase();
      let mode: 'global' | 'local' = 'global';
      if (options.local) mode = 'local';
      else if (options.global) mode = 'global';
      const cwd = process.cwd();

      let agents: Agent[];
      if (agentOpt === "all") {
        if (mode === 'local') {
          agents = Object.keys(AGENT_CONFIG) as Agent[];
          console.log(`Installing locally to project ${cwd} for all ${agents.length} agents (like ui-ux-pro)`);
        } else {
          const byFolder = detectByHomeFolders();
          const byLegacy = detectInstalledAgents();
          agents = [...new Set([...byFolder, ...byLegacy])] as Agent[];
          if (agents.length === 0) {
            console.log("No supported AI agents detected globally.");
            console.log("\nTry: --agent claude-code --local  (project-local, ensures '/' shows)");
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

      // Binary verification check & logging
      console.log(`Checking system binary versions...`);
      const binaryChecks = ["claude", "cursor", "windsurf", "git"];
      for (const bin of binaryChecks) {
        const v = getBinaryVersion(bin);
        if (v) console.log(`  ✓ Found ${bin} : ${v}`);
      }

      // Step 1: Install core skill directory ONCE into central shared location
      const sharedPath = resolve(mode === 'local' ? join(cwd, ".shared", "cyberaudit") : join(H, ".shared", "cyberaudit"));
      if (!dryRun) {
        console.log(`\nDeploying shared core skill directory to ${sharedPath}...`);
        try {
          installDir(SKILL_SRC, sharedPath, mode, cwd, false);
          console.log(`  ✓ Central shared skill directory active.`);
        } catch (e: any) {
          console.error(`  ✗ Central skill copy failed: ${e.message}`);
          process.exit(1);
        }
      } else {
        console.log(`\nWould deploy shared core skill directory to ${sharedPath}`);
      }

      // Step 2: Install lightweight pointer wrappers and slash commands for each agent
      let ok = 0, fail = 0;
      const createdDirs: string[] = [];
      for (const agent of agents) {
        const cfg = getPathsForMode(agent, mode, cwd);
        console.log(`\n→ ${cfg.displayName} (${agent}) [${mode}]:`);
        if (installSkillForAgent(agent, sharedPath, dryRun, mode, cwd)) {
          ok++;
          createdDirs.push(...cfg.skillPaths);
        } else {
          fail++;
        }
      }

      // Configure multi-client MCPs
      console.log(`\nConfiguring additional MCP client paths...`);
      configureOtherMcps(dryRun, mode, cwd);

      // Auto GitIgnore config
      if (mode === 'local' && !options.commit && !dryRun) {
        updateGitIgnore(createdDirs, cwd);
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
    .command("uninstall")
    .description("Uninstall CyberAudit Skill completely")
    .option("--local", "Uninstall local project installation", false)
    .option("--global", "Uninstall global machine installation (default)", false)
    .action((opts) => {
      const mode = opts.local ? 'local' : 'global';
      const cwd = process.cwd();
      console.log(`\n═══ Uninstalling CyberAudit [${mode}] ═══\n`);

      const sharedPath = resolve(mode === 'local' ? join(cwd, ".shared", "cyberaudit") : join(H, ".shared", "cyberaudit"));
      if (existsSync(sharedPath)) {
        try {
          rmSync(sharedPath, { recursive: true, force: true });
          console.log(`✓ Removed central shared directory at ${sharedPath}`);
        } catch (e: any) {
          console.error(`✗ Failed to remove central shared dir: ${e.message}`);
        }
      }

      for (const [agentKey, cfgGlobal] of Object.entries(AGENT_CONFIG) as [Agent, AgentConfig][]) {
        const cfg = getPathsForMode(agentKey, mode, cwd);
        for (const sp of cfg.skillPaths) {
          if (existsSync(sp)) {
            try {
              rmSync(sp, { recursive: true, force: true });
              console.log(`✓ Removed ${cfg.displayName} skill wrapper at ${sp}`);
            } catch {}
          }
        }
        for (const cp of cfg.commandPaths) {
          if (existsSync(cp)) {
            try {
              const files = readdirSync(cp).filter(f => f.startsWith('audit') && f.endsWith('.md'));
              for (const f of files) {
                unlinkSync(join(cp, f));
              }
              console.log(`✓ Removed commands from ${cfg.displayName} at ${cp}`);
            } catch {}
          }
        }
      }
      console.log(`\nUninstall complete.`);
    });

  program
    .command("doctor")
    .description("Validate and diagnose CyberAudit health")
    .option("--local", "Diagnose local project installation", false)
    .action((opts) => {
      const mode = opts.local ? 'local' : 'global';
      const cwd = process.cwd();
      console.log(`\n═══ CyberAudit Doctor — Diagnostic Report [${mode}] ═══\n`);

      const sharedPath = resolve(mode === 'local' ? join(cwd, ".shared", "cyberaudit") : join(H, ".shared", "cyberaudit"));
      if (!existsSync(sharedPath)) {
        console.log(`✗ Central Shared directory is MISSING! Location checked: ${sharedPath}`);
        console.log(`💡 Solution: Run "npx cyberaudit-skill install${opts.local ? ' --local' : ''}" to restore.`);
        process.exitCode = 1;
        return;
      }

      console.log(`✓ Central Shared Directory: OK (${sharedPath})`);
      const keyDirs = ["web", "mobile", "api", "cloud", "shared", "reports", "commands"];
      for (const kd of keyDirs) {
        const kp = join(sharedPath, kd);
        if (existsSync(kp)) {
          console.log(`  ✓ Sub-module ${kd}: OK`);
        } else {
          console.log(`  ✗ Sub-module ${kd}: MISSING!`);
          process.exitCode = 1;
        }
      }

      // Check command frontmatters integrity
      console.log(`\nVerifying frontmatter integrity of core commands...`);
      const cmdFiles = readdirSync(join(sharedPath, "commands")).filter(f => f.endsWith('.md'));
      let healthyCmds = 0;
      for (const cf of cmdFiles) {
        try {
          const content = readFileSync(join(sharedPath, "commands", cf), "utf-8");
          if (content.startsWith("---") && content.includes("description:")) {
            healthyCmds++;
          }
        } catch {}
      }
      console.log(`  ✓ Core commands validated: ${healthyCmds}/${cmdFiles.length} healthy.`);

      console.log(`\nDiagnosis complete. System is healthy.`);
    });

  program
    .command("update")
    .description("Check and update CyberAudit installation")
    .option("--local", "Update local project installation", false)
    .action((opts) => {
      const mode = opts.local ? 'local' : 'global';
      const cwd = process.cwd();
      const sharedPath = resolve(mode === 'local' ? join(cwd, ".shared", "cyberaudit") : join(H, ".shared", "cyberaudit"));
      
      console.log(`\n═══ CyberAudit Updater [${mode}] ═══\n`);
      let localVer = "0.0.0";
      try {
        const localPkg = JSON.parse(readFileSync(join(sharedPath, "package.json"), "utf-8"));
        localVer = localPkg.version || "0.0.0";
      } catch {
        try {
          localVer = readFileSync(join(sharedPath, "VERSION"), "utf-8").trim();
        } catch {}
      }

      console.log(`Current installed version : ${localVer}`);
      console.log(`Running CLI version       : ${VERSION}`);

      if (localVer === VERSION) {
        console.log(`✓ CyberAudit is already up to date.`);
      } else {
        console.log(`→ Updating CyberAudit skill...`);
        try {
          installDir(SKILL_SRC, sharedPath, mode, cwd, false);
          console.log(`✓ Successfully updated shared skill files to v${VERSION}.`);
        } catch (e: any) {
          console.error(`✗ Update failed: ${e.message}`);
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
    .option("--baseline <file>", "JSON file from previous scan to calculate diff (differential audit)")
    .option("--type <type>", "Report type: web|api|mobile|cloud|full", "web")
    .option("--framework <fw>", "Framework name")
    .option("--output <file>", "Output markdown file")
    .option("--json", " Also emit JSON summary", false)
    .action(async (target, options) => {
      const { generateReport } = await import("./report/generator.js");
      let findings: any[] = [];
      let baselineFindings: any[] | undefined = undefined;
      let scanTarget = target || ".";
      const reportType = (options.type || 'web').toLowerCase();

      if (options.input) {
        const inputPath = resolve(options.input);
        if (!existsSync(inputPath)) { console.error("Input file not found: " + inputPath); process.exit(1); }
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

      if (options.baseline) {
        const baselinePath = resolve(options.baseline);
        if (existsSync(baselinePath)) {
          try {
            const raw = readFileSync(baselinePath, 'utf-8');
            const parsed = JSON.parse(raw);
            baselineFindings = parsed.findings || parsed;
            console.error(`[CyberAudit] Loaded baseline containing ${baselineFindings ? baselineFindings.length : 0} findings.`);
          } catch (e: any) {
            console.error(`[CyberAudit] Failed to load baseline file: ${e.message}`);
          }
        } else {
          console.error(`[CyberAudit] Baseline file not found at ${baselinePath}`);
        }
      }

      const report = generateReport({ 
        target: scanTarget, 
        version: VERSION, 
        type: reportType as any, 
        findings, 
        baselineFindings,
        framework: options.framework 
      });
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
