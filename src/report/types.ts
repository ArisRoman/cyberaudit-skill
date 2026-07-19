export interface UnifiedFinding {
  id: string;
  patternId: string;
  scanner: 'secrets' | 'web' | 'api' | 'cloud' | 'manual';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  cvss: number;
  cvssVector: string;
  file: string;
  line: number;
  match: string;
  description: string;
  remediation: string;
  owasp?: string;
  cwe?: string;
  framework?: string;
}

export interface ReportInput {
  target: string;
  version: string;
  type: 'web' | 'api' | 'mobile' | 'cloud' | 'full';
  findings: UnifiedFinding[];
  framework?: string;
  date?: string;
}

export interface ReportOutput {
  markdown: string;
  score: number;
  verdict: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'GOOD' | 'EXCELLENT';
  dashboard: Record<string, number>;
  owaspCompliance: Record<string, string>;
}
