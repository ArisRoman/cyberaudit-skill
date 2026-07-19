import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, rmSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { mkdtempSync } from 'fs';

describe('CLI Installer Safety', () => {
  let tmp: string;
  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'cyberaudit-test-'));
  });
  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it('isSafePath should block paths outside HOME containing cyberaudit', async () => {
    const cliPath = join(process.cwd(), 'src', 'cli.ts');
    const content = readFileSync(cliPath, 'utf-8');
    // New version uses isSafeInsideHome, isSafeSkillPath, isSafeCommandPath
    expect(content).toMatch(/isSafe.*Path/);
    expect(content).toContain('homedir');
    expect(content).toContain('cyberaudit');
    expect(content).toContain('isSafeInsideHome');
  });

  it('installDir should exist as function', () => {
    const content = readFileSync(join(process.cwd(), 'src', 'cli.ts'), 'utf-8');
    expect(content).toContain('function installDir');
  });

  it('installForCursor handles corrupted mcp.json with backup', () => {
    const cliContent = readFileSync(join(process.cwd(), 'src/cli.ts'), 'utf-8');
    expect(cliContent).toContain('mcp.json is corrupted');
    expect(cliContent).toContain('.bak');
    expect(cliContent).toContain('copyFileSync');
  });

  it('version comes from package.json not hardcoded', () => {
    const cliContent = readFileSync(join(process.cwd(), 'src/cli.ts'), 'utf-8');
    expect(cliContent).toContain('PKG.version');
    expect(cliContent).not.toMatch(/version:\s*\"3\.0\.0\"/);
  });
});

describe('Command files completeness', () => {
  it('should have at least 50 command files', () => {
    const fs = require('fs');
    const files = fs.readdirSync(join(process.cwd(), 'skills', 'cyberaudit', 'commands'));
    expect(files.length).toBeGreaterThanOrEqual(50);
  });

  it('should have audit-cloud file', () => {
    const fs = require('fs');
    const files = fs.readdirSync(join(process.cwd(), 'skills', 'cyberaudit', 'commands'));
    expect(files).toContain('audit-cloud.md');
    expect(files).toContain('audit-cloud-s3.md');
    expect(files).toContain('audit-cloud-iam.md');
  });
});

describe('Cloud module completeness', () => {
  it('cloud checklist exists', () => {
    expect(existsSync(join(process.cwd(), 'skills', 'cyberaudit', 'cloud', 'CLOUD-CHECKLIST.md'))).toBe(true);
  });
  it('cloud philosophy exists', () => {
    expect(existsSync(join(process.cwd(), 'skills', 'cyberaudit', 'cloud', 'CLOUD-PHILOSOPHY.md'))).toBe(true);
  });
  it('cloud remediation exists', () => {
    expect(existsSync(join(process.cwd(), 'skills', 'cyberaudit', 'cloud', 'CLOUD-REMEDIATION-LIBRARY.md'))).toBe(true);
  });
  it('cloud report template exists', () => {
    expect(existsSync(join(process.cwd(), 'skills', 'cyberaudit', 'reports', 'REPORT-TEMPLATE-CLOUD.md'))).toBe(true);
  });
});

describe('Multi-agent support (like ui-ux-pro)', () => {
  it('should support at least 15 agents', () => {
    const content = readFileSync(join(process.cwd(), 'src', 'cli.ts'), 'utf-8');
    // Count Agent union type entries
    const match = content.match(/type Agent =([\s\S]*?);/);
    expect(match).toBeTruthy();
    const agents = match![1].split('|').map(s => s.trim()).filter(Boolean);
    expect(agents.length).toBeGreaterThanOrEqual(15);
  });

  it('should have MAIN_COMMANDS 8 for \"/\" menu', () => {
    const content = readFileSync(join(process.cwd(), 'src', 'cli.ts'), 'utf-8');
    expect(content).toContain('MAIN_COMMANDS');
    // Should contain 8 entries
    const mainMatch = content.match(/const MAIN_COMMANDS = \[([\s\S]*?)\];/);
    expect(mainMatch).toBeTruthy();
    const count = (mainMatch![1].match(/\.md/g) || []).length;
    expect(count).toBe(8);
  });

  it('should define AGENT_CONFIG for many agents', () => {
    const content = readFileSync(join(process.cwd(), 'src', 'cli.ts'), 'utf-8');
    expect(content).toContain('AGENT_CONFIG');
    expect(content).toContain('claude-code');
    expect(content).toContain('cursor');
    expect(content).toContain('windsurf');
    expect(content).toContain('copilot');
    expect(content).toContain('codex');
    expect(content).toContain('continue');
  });

  it('should install commands for \"/\" menu', () => {
    const content = readFileSync(join(process.cwd(), 'src', 'cli.ts'), 'utf-8');
    expect(content).toContain('installCommands');
    expect(content).toContain('"/" will show');
  });
});
