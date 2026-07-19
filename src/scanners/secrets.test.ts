import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { scanSecrets, PATTERNS } from './secrets.js';

// Helpers to avoid literal secrets in source (GitHub secret scanning would block push)
// We build secrets at runtime via concatenation, so source doesn't contain contiguous secret
function buildSecret(parts: string[]): string {
  return parts.join('');
}

describe('Secrets Scanner', () => {
  let tmp: string;
  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'cyberaudit-secrets-'));
  });
  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it('should have at least 14 patterns', () => {
    expect(PATTERNS.length).toBeGreaterThanOrEqual(14);
  });

  it('should detect AWS access key', () => {
    const key = buildSecret(['AKIA', '1234567890ABCDEF']);
    writeFileSync(join(tmp, 'test.js'), `const key = "${key}";`);
    const findings = scanSecrets(tmp);
    const aws = findings.find(f => f.patternId === 'AWS_ACCESS_KEY');
    expect(aws).toBeDefined();
    expect(aws?.severity).toBe('CRITICAL');
    expect(aws?.match).toContain('*');
  });

  it('should detect GitHub PAT', () => {
    const pat = buildSecret(['ghp_', '1234567890abcdefghij1234567890abcdefgh']);
    writeFileSync(join(tmp, 'config.ts'), `token = "${pat}"`);
    const findings = scanSecrets(tmp);
    const gh = findings.find(f => f.patternId === 'GITHUB_PAT');
    expect(gh).toBeDefined();
  });

  it('should detect Stripe secret key', () => {
    const sk = buildSecret(['sk_live_', '1234567890abcdefghij12345']);
    writeFileSync(join(tmp, 'payment.js'), `const stripe = "${sk}";`);
    const findings = scanSecrets(tmp);
    expect(findings.some(f => f.patternId === 'STRIPE_SK')).toBe(true);
  });

  it('should detect private key', () => {
    const begin = buildSecret(['-----BEGIN ', 'RSA PRIVATE KEY-----']);
    writeFileSync(join(tmp, 'key.pem'), `${begin}\nMIIE...`);
    const findings = scanSecrets(tmp);
    expect(findings.some(f => f.patternId === 'PRIVATE_KEY')).toBe(true);
  });

  it('should detect NEXT_PUBLIC_ secret', () => {
    const val = buildSecret(['NEXT_PUBLIC_API_SECRET=sk-abc123supersecretvalue']);
    writeFileSync(join(tmp, '.env.local'), val);
    const findings = scanSecrets(tmp);
    expect(findings.some(f => f.patternId === 'NEXT_PUBLIC_SECRET')).toBe(true);
  });

  it('should detect database URL with password', () => {
    const url = buildSecret(['postgres://user:super', 'secret123@localhost/db']);
    writeFileSync(join(tmp, 'db.js'), `const url = "${url}";`);
    const findings = scanSecrets(tmp);
    expect(findings.some(f => f.patternId === 'DATABASE_URL')).toBe(true);
  });

  it('should ignore node_modules', () => {
    const nm = join(tmp, 'node_modules');
    mkdirSync(nm);
    const key = buildSecret(['AKIA', '1234567890ABCDEF']);
    writeFileSync(join(nm, 'bad.js'), `const key = "${key}";`);
    const findings = scanSecrets(tmp);
    expect(findings.length).toBe(0);
  });

  it('should return empty when no secrets', () => {
    writeFileSync(join(tmp, 'clean.js'), 'const a = 1; console.log("hello world");');
    const findings = scanSecrets(tmp);
    expect(findings.length).toBe(0);
  });

  it('should sort by severity CRITICAL first', () => {
    const key = buildSecret(['AKIA', '1234567890ABCDEF']);
    writeFileSync(join(tmp, 'mixed.js'), `
      const a = "${key}";
      const b = "some high entropy string maybe? 'ABCDE'";
      const c = 'password = "supersecret123"';
    `);
    const findings = scanSecrets(tmp);
    expect(findings.length).toBeGreaterThanOrEqual(2);
    expect(findings[0].severity).toBe('CRITICAL');
  });

  it('should redact secrets in output', () => {
    const key = buildSecret(['AKIA', '1234567890ABCDEF']);
    writeFileSync(join(tmp, 'test.js'), `const key = "${key}";`);
    const findings = scanSecrets(tmp);
    expect(findings.length).toBeGreaterThan(0);
    const f = findings[0];
    expect(f.fullMatch).toBe(key);
    expect(f.match).not.toBe(f.fullMatch);
    expect(f.match).toContain('*');
  });
});
