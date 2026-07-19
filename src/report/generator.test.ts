import { describe, it, expect } from 'vitest';
import { generateReport } from './generator.js';
import { UnifiedFinding } from './types.js';

describe('Report Generator', () => {
  it('should generate empty report with 100 score when no findings', () => {
    const out = generateReport({
      target: './src',
      version: '3.1.5',
      type: 'web',
      findings: [],
    });
    expect(out.score).toBe(100);
    expect(out.verdict).toBe('EXCELLENT');
    expect(out.markdown).toContain('No deterministic findings');
    expect(out.markdown).toContain('100/100');
  });

  it('should calculate score based on severity', () => {
    const findings: UnifiedFinding[] = [
      { id: '1', patternId: 'AWS_ACCESS_KEY', scanner: 'secrets', severity: 'CRITICAL', cvss: 9.1, cvssVector: 'CVSS:3.1/...', file: 'a.js', line: 1, match: 'AKIA...', description: 'desc', remediation: 'fix', owasp: 'A07' } as any,
      { id: '2', patternId: 'WEB_XSS', scanner: 'web', severity: 'HIGH', cvss: 7.5, cvssVector: 'CVSS:3.1/...', file: 'b.js', line: 2, match: 'innerHTML', description: 'desc', remediation: 'fix', owasp: 'A03' } as any,
    ];
    const out = generateReport({
      target: './app',
      version: '3.1.5',
      type: 'web',
      findings,
    });
    // 100 -20 -10 =70
    expect(out.score).toBe(70);
    expect(out.dashboard.CRITICAL).toBe(1);
    expect(out.dashboard.HIGH).toBe(1);
    expect(out.markdown).toContain('CRITICAL');
    expect(out.markdown).toContain('AWS_ACCESS_KEY');
  });

  it('should produce markdown with required sections', () => {
    const findings: UnifiedFinding[] = [
      { id: 'VULN-001', patternId: 'WEB_SQLI_CONCAT', scanner: 'web', severity: 'CRITICAL', cvss: 9.8, cvssVector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H', file: 'db.js', line: 10, match: 'db.query("SELECT "+req.query.id)', description: 'SQLi via concat', remediation: 'Use param query', owasp: 'A03', cwe: 'CWE-89' },
    ];
    const out = generateReport({
      target: 'myapp',
      version: '3.1.5',
      type: 'web',
      findings,
      framework: 'Express',
    });
    expect(out.markdown).toContain('REPORT HEADER');
    expect(out.markdown).toContain('EXECUTIVE SUMMARY');
    expect(out.markdown).toContain('DETAILED FINDINGS');
    expect(out.markdown).toContain('OWASP TOP 10');
    expect(out.markdown).toContain('PRIORITISED REMEDIATION PLAN');
    expect(out.markdown).toContain('CONCLUSION');
    expect(out.markdown).toContain('myapp');
    expect(out.markdown).toContain('Express');
  });

  it('should set NO-GO for critical', () => {
    const findings: UnifiedFinding[] = [
      { id: '1', patternId: 'WEB_EVAL', scanner: 'web', severity: 'CRITICAL', cvss: 9.8, cvssVector: 'CVSS:3.1/...', file: 'bad.js', line: 1, match: 'eval(', description: 'eval', remediation: 'remove', owasp: 'A03' } as any,
    ];
    const out = generateReport({ target: '.', version: '3.1.5', type: 'web', findings });
    expect(out.verdict).toBe('CRITICAL');
    expect(out.markdown).toContain('NO-GO');
  });

  it('should contain bar visualization', () => {
    const out = generateReport({ target: '.', version: '3.1.5', type: 'web', findings: [] });
    expect(out.markdown).toContain('█');
    // For 100% score, bar is fully filled, no ░ expected. Test with non-100 score for both chars
    const findings: UnifiedFinding[] = [
      { id: '1', patternId: 'WEB_EVAL', scanner: 'web', severity: 'MEDIUM', cvss: 5.0, cvssVector: 'CVSS:3.1/...', file: 'a.js', line: 1, match: 'eval(', description: 'eval', remediation: 'remove', owasp: 'A03' } as any,
    ];
    const out2 = generateReport({ target: '.', version: '3.1.5', type: 'web', findings });
    expect(out2.markdown).toContain('█');
    expect(out2.markdown).toContain('░');
  });
});
