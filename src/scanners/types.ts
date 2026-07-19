export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

export interface SecretFinding {
  id: string; // D1, pattern id
  patternId: string;
  severity: Severity;
  cvss: number;
  cvssVector: string;
  file: string;
  line: number;
  column?: number;
  match: string; // redacted preview
  fullMatch: string; // full for internal, will be redacted in output
  description: string;
  remediation: string;
  owasp?: string;
  cwe?: string;
}

export interface ScanOptions {
  ignore?: string[]; // glob ignore, default node_modules, .git, dist, coverage, .next
  maxFileSizeBytes?: number;
  extensions?: string[]; // if empty, scan all text
}
