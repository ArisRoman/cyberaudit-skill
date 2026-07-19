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
const VERSION = PKG.version || "3.1.5";

type Agent = "opencode" | "claude-code" | "kiro" | "cursor" | "gemini" | "antigravity" | "antigravity-cli";

const AGENT_TARGETS: Record<Agent, string[]> = {
  "opencode":        [join(homedir(), ".agents", "skills", "cyberaudit")],
  "claude-code":     [join(homedir(), ".claude", "skills", "cyberaudit")],
  "kiro":            [join(homedir(), ".kiro", "skills", "cyberaudit")],
  "cursor":          [join(homedir(), ".cursor", "mcp.json")],
  "gemini":          [join(homedir(), ".gemini", "skills", "cyberaudit")],
  "antigravity":     [join(homedir(), ".gemini", "antigravity", "skills", "cyberaudit")],
  "antigravity-cli": [join(homedir(), ".gemini", "antigravity-cli", "skills", "cyberaudit")],
};

function isSafePath(p: string): boolean {
  const home = resolve(homedir());
  const resolved = resolve(p);
  return resolved.startsWith(home) && resolved.includes("cyberaudit");
}

function detectInstalledAgents(): Agent[] {
  const found: Agent[] = [];
  const skipDetection = new Set(["cursor", "gemini", "antigravity", "antigravity-cli"]);
  for (const [agent, paths] of Object.entries(AGENT_TARGETS)) {
    if (skipDetection.has(agent)) continue;
    if (paths.some((p) => existsSync(dirname(p)))) {
      found.push(agent as Agent);
    }
  }
  if (existsSync(join(homedir(), ".cursor"))) found.push("cursor");
  if (existsSync(join(homedir(), ".gemini"))) found.push("gemini");
  if (existsSync(join(homedir(), ".gemini", "antigravity"))) found.push("antigravity");
  if (existsSync(join(homedir(), ".gemini", "antigravity-cli"))) found.push("antigravity-cli");
  return found;
}

function installDir(src: string, dst: string): void {
  if (!existsSync(src)) {
    throw new Error(`Source not found: ${src}`);
  }
  if (!isSafePath(dst)) {
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

function installSkill(targetDir: string, agent: string, dryRun: boolean): boolean {
  if (!existsSync(SKILL_SRC)) {
    console.error(`✗ Skill source not found at ${SKILL_SRC}.`);
    return false;
  }

  if (dryRun) {
    console.log(`  → Would install to ${targetDir} (--dry-run)`);
    return true;
  }

  try {
    // Wipe + re-copy skill dir so stale files are cleaned up
    installDir(SKILL_SRC, targetDir);
    console.log(`  ✓ Installed at ${targetDir}`);
  } catch (e: any) {
    console.error(`  ✗ Failed to install at ${targetDir}: ${e.message}`);
    return false;
  }

  // Install command + skill files for opencode
  if (agent === "opencode") {
    const opencodeConf = join(homedir(), ".config", "opencode");

    const cmdSrc = join(PKG_ROOT, "skills", "cyberaudit", "commands");
    if (existsSync(cmdSrc)) {
      // Remove stale audit command files only, warn before
      const cmdDst = join(opencodeConf, "commands");
      if (existsSync(cmdDst)) {
        const stale = readdirSync(cmdDst).filter((f) => typeof f === "string" && f.startsWith("audit") && f.endsWith(".md"));
        if (stale.length > 0) {
          console.log(`  ♻️  Removing ${stale.length} stale audit commands from opencode: ${stale.join(", ")}`);
          for (const f of stale) {
            try { unlinkSync(join(cmdDst, f)); } catch {}
          }
        }
      }
      mkdirSync(cmdDst, { recursive: true });
      cpSync(cmdSrc, cmdDst, { recursive: true });
      console.log(`  ✓ Commands installed to opencode (${cmdDst})`);
    }

    // Wipe + re-copy opencode skill dir
    const opencodeSkillDst = join(opencodeConf, "skills", "cyberaudit");
    try {
      if (isSafePath(opencodeSkillDst)) {
        installDir(SKILL_SRC, opencodeSkillDst);
        console.log(`  ✓ Skill installed to opencode (${opencodeSkillDst})`);
      }
    } catch (e: any) {
      console.error(`  ✗ Failed opencode secondary install: ${e.message}`);
    }
  }

  return true;
}

function installForCursor(dryRun: boolean): boolean {
  const cursorDir = join(homedir(), ".cursor");
  if (!existsSync(cursorDir)) {
    console.log("  ~ Cursor not found (no ~/.cursor/) — skipping");
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

  // Backup before write
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

function installForAgent(agent: Agent, dryRun: boolean): boolean {
  switch (agent) {
    case "cursor":
      return installForCursor(dryRun);
    default: {
      const paths = AGENT_TARGETS[agent];
      if (!paths?.length) return false;
      return installSkill(paths[0], agent, dryRun);
    }
  }
}

async function main() {
  const program = new Command();

  program
    .name("cyberaudit-skill")
    .description("CyberAudit Skill — universal security audit skill for AI agents")
    .version(VERSION);

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
          console.log("No supported AI agents detected. Checked ~/.agents, ~/.claude, ~/.cursor, ~/.kiro, ~/.gemini");
          console.log("Try: --agent opencode  or  --agent claude-code  or  --agent cursor");
          process.exit(1);
        }
        console.log(`Detected agents: ${agents.join(", ")}`);
      } else {
        const valid: Agent[] = ["opencode", "claude-code", "kiro", "cursor", "gemini", "antigravity", "antigravity-cli"];
        if (!valid.includes(agentOpt as Agent)) {
          console.error(`Unknown agent: "${agentOpt}". Valid: ${valid.join(", ")}, all`);
          process.exit(1);
        }
        agents = [agentOpt as Agent];
      }

      const label = dryRun ? " (dry run)" : "";
      console.log(`\n═══ CyberAudit v${VERSION} Installation${label} ═══\n`);

      let ok = 0, fail = 0;
      for (const agent of agents) {
        console.log(`\n→ ${agent}:`);
        if (installForAgent(agent, dryRun)) ok++; else fail++;
      }

      console.log(`\nDone. ${ok} configured, ${fail} skipped/failed.\n`);
      if (!dryRun && ok > 0) console.log("Verify: npx -y cyberaudit-skill list\n");
    });

  program
    .command("list")
    .description("List audits and installed agents")
    .action(() => {
      console.log(`\n═══ CyberAudit v${VERSION} — Available Audits ═══\n`);
      console.log("  cyberaudit-web       OWASP web app security audit");
      console.log("  cyberaudit-mobile    OWASP mobile app security audit");
      console.log("  cyberaudit-api       API security audit (REST/GraphQL/WS)");
      console.log("  cyberaudit-cloud     Cloud config audit (S3, IAM, SG, storage)");
      console.log("  cyberaudit-full      Full stack (web + API + cloud)");
      console.log("  cyberaudit-quick     Quick vulnerability scan (secrets + criticals)\n");
      console.log("═══ Installed Agents ═══\n");
      for (const [agent] of Object.entries(AGENT_TARGETS)) {
        if (agent === "cursor") {
          const mcpPath = join(homedir(), ".cursor", "mcp.json");
          let ok = false;
          try {
            if (existsSync(mcpPath)) {
              ok = readFileSync(mcpPath, "utf-8").includes("cyberaudit-skill");
            }
          } catch {}
          console.log(`  ${ok ? "✓" : "✗"} ${agent}${ok ? ` (${mcpPath})` : ""}`);
        } else {
          const paths = AGENT_TARGETS[agent as Agent];
          let ok = false;
          let foundPath = "";
          for (const p of paths) {
            if (existsSync(p)) { ok = true; foundPath = p; break; }
          }
          console.log(`  ${ok ? "✓" : "✗"} ${agent}${ok ? ` (${foundPath})` : ""}`);
        }
      }
      console.log();
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
        const allFindings: any[] = [];
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
        // Auto-scan
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
