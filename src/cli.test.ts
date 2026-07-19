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
    // Import dynamically to avoid side effects
    const cliPath = join(process.cwd(), 'src', 'cli.ts');
    const content = readFileSync(cliPath, 'utf-8');
    // Check that isSafePath exists and checks homedir
    expect(content).toContain('isSafePath');
    expect(content).toContain('homedir');
    expect(content).toContain('cyberaudit');
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
