import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { scanWeb } from './web.js';

describe('Web Scanner', () => {
  let tmp: string;
  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'cyberaudit-web-'));
  });
  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it('should detect SQLi concat', () => {
    writeFileSync(join(tmp, 'db.js'), 'db.query("SELECT * FROM users WHERE id = " + req.query.id);');
    const findings = scanWeb(tmp);
    expect(findings.some(f => f.patternId === 'WEB_SQLI_CONCAT' || f.patternId === 'WEB_SQLI_RAW')).toBe(true);
  });

  it('should detect XSS dangerouslySetInnerHTML', () => {
    writeFileSync(join(tmp, 'comp.jsx'), '<div dangerouslySetInnerHTML={{ __html: userInput }} />');
    const findings = scanWeb(tmp);
    expect(findings.some(f => f.patternId === 'WEB_XSS_DANGEROUS')).toBe(true);
  });

  it('should not flag XSS if DOMPurify present', () => {
    writeFileSync(join(tmp, 'comp.jsx'), `
      import DOMPurify from 'dompurify';
      <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(userInput) }} />
    `);
    const findings = scanWeb(tmp);
    // Should be filtered because DOMPurify present
    expect(findings.some(f => f.patternId === 'WEB_XSS_DANGEROUS')).toBe(false);
  });

  it('should detect jwt.decode', () => {
    writeFileSync(join(tmp, 'auth.js'), 'const payload = jwt.decode(token);');
    const findings = scanWeb(tmp);
    expect(findings.some(f => f.patternId === 'WEB_JWT_DECODE')).toBe(true);
  });

  it('should detect CORS wildcard', () => {
    writeFileSync(join(tmp, 'server.js'), "app.use(cors({ origin: '*' }));");
    const findings = scanWeb(tmp);
    expect(findings.some(f => f.patternId === 'WEB_CORS_WILDCARD')).toBe(true);
  });

  it('should detect eval', () => {
    writeFileSync(join(tmp, 'bad.js'), 'eval(userInput);');
    const findings = scanWeb(tmp);
    expect(findings.some(f => f.patternId === 'WEB_EVAL')).toBe(true);
  });

  it('should detect mass assignment', () => {
    writeFileSync(join(tmp, 'user.js'), 'User.create(req.body);');
    const findings = scanWeb(tmp);
    expect(findings.some(f => f.patternId === 'WEB_MASS_ASSIGNMENT')).toBe(true);
  });

  it('should detect NoSQL injection', () => {
    writeFileSync(join(tmp, 'login.js'), 'db.users.find({ username: req.body.username });');
    const findings = scanWeb(tmp);
    expect(findings.some(f => f.patternId === 'WEB_NOSQL_INJECTION')).toBe(true);
  });

  it('should return empty for clean file', () => {
    writeFileSync(join(tmp, 'clean.js'), 'const a = 1; console.log(a);');
    const findings = scanWeb(tmp);
    expect(findings.length).toBe(0);
  });

  it('should have at least 10 patterns', async () => {
    const { WEB_PATTERNS } = await import('./web.js');
    expect(WEB_PATTERNS.length).toBeGreaterThanOrEqual(10);
  });
});
