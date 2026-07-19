import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { SecretFinding, ScanOptions, Severity } from './types.js';

type Pattern = {
  id: string;
  name: string;
  regex: RegExp;
  severity: Severity;
  cvss: number;
  cvssVector: string;
  description: string;
  remediation: string;
  owasp: string;
  cwe: string;
  redact?: (m: string) => string;
};

const DEFAULT_IGNORE = [
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  '.nuxt',
  '.output',
  'coverage',
  '.cache',
  '.turbo',
  'out',
  '.vercel',
  '.serverless',
  'vendor',
];

function redactMiddle(s: string, keep = 4): string {
  if (s.length <= keep * 2) return '*'.repeat(s.length);
  return s.slice(0, keep) + '*'.repeat(s.length - keep * 2) + s.slice(-keep);
}

function redactSecret(match: string): string {
  // Keep first 4 and last 4 if long, otherwise mask 80%
  const trimmed = match.trim();
  if (trimmed.length < 12) return '***REDACTED***';
  // If it's key=value, redact value only
  const eqIdx = trimmed.indexOf('=');
  const colonIdx = trimmed.indexOf(':');
  let sepIdx = -1;
  if (eqIdx !== -1 && (colonIdx === -1 || eqIdx < colonIdx)) sepIdx = eqIdx;
  else if (colonIdx !== -1) sepIdx = colonIdx;
  if (sepIdx !== -1 && sepIdx < trimmed.length - 2) {
    const before = trimmed.slice(0, sepIdx + 1);
    const after = trimmed.slice(sepIdx + 1).trim();
    // strip quotes for redaction
    const quote = after[0] === '"' || after[0] === "'" ? after[0] : '';
    const core = after.replace(/^['"\s]+|['"\s]+$/g, '');
    if (core.length > 8) {
      return `${before} ${quote}${redactMiddle(core)}${quote}`;
    }
  }
  return redactMiddle(trimmed, 4);
}

const PATTERNS: Pattern[] = [
  {
    id: 'AWS_ACCESS_KEY',
    name: 'AWS Access Key ID',
    regex: /AKIA[0-9A-Z]{16}/g,
    severity: 'CRITICAL',
    cvss: 9.1,
    cvssVector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N',
    description: 'Hardcoded AWS Access Key ID found. Enables attacker to use AWS credentials if secret key also exposed.',
    remediation: 'Move to env var AWS_ACCESS_KEY_ID via Secrets Manager / Parameter Store. Rotate key immediately. Use IAM roles for EC2/Lambda, not static keys.',
    owasp: 'A07:2021 — Identification and Authentication Failures',
    cwe: 'CWE-798',
  },
  {
    id: 'AWS_SECRET_KEY',
    name: 'AWS Secret Access Key',
    regex: /(?:aws_secret_access_key|aws_secret|AWS_SECRET)[\s]*[:=][\s]*['"]?([A-Za-z0-9/+=]{40})['"]?/gi,
    severity: 'CRITICAL',
    cvss: 9.8,
    cvssVector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H',
    description: 'Hardcoded AWS Secret Access Key. Full account takeover possible if paired with access key.',
    remediation: 'Store in AWS Secrets Manager, never commit. Rotate immediately. Prefer IAM roles.',
    owasp: 'A07:2021',
    cwe: 'CWE-798',
  },
  {
    id: 'GITHUB_PAT',
    name: 'GitHub Personal Access Token',
    regex: /gh[pousr]_[A-Za-z0-9_]{36,}/g,
    severity: 'CRITICAL',
    cvss: 9.1,
    cvssVector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N',
    description: 'GitHub PAT exposed. Allows repo access, code theft, supply chain injection.',
    remediation: 'Revoke token in GitHub Settings > Developer settings. Use fine-grained tokens with expiry <30d, store in env.',
    owasp: 'A07:2021',
    cwe: 'CWE-798',
  },
  {
    id: 'STRIPE_SK',
    name: 'Stripe Secret Key',
    regex: /sk_(?:live|test)_[0-9a-zA-Z]{20,}/g,
    severity: 'CRITICAL',
    cvss: 9.1,
    cvssVector: 'CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:N',
    description: 'Stripe secret key hardcoded. Allows payment fraud, refunds, data theft.',
    remediation: 'Move to STRIPE_SECRET_KEY env. Rotate in Stripe Dashboard. Use restricted keys, not secret keys in frontend.',
    owasp: 'A07:2021',
    cwe: 'CWE-798',
  },
  {
    id: 'PRIVATE_KEY',
    name: 'Private Key (RSA/DSA/EC/OPENSSH)',
    regex: /-----BEGIN (?:RSA |DSA |EC |OPENSSH )?PRIVATE KEY-----/g,
    severity: 'CRITICAL',
    cvss: 9.8,
    cvssVector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H',
    description: 'Private key committed. Allows impersonation, decryption, signing.',
    remediation: 'Remove from repo, purge git history (BFG). Store in KMS / Secrets Manager. Never commit.',
    owasp: 'A07:2021',
    cwe: 'CWE-798',
  },
  {
    id: 'SLACK_TOKEN',
    name: 'Slack Token',
    regex: /xox[baprs]-[0-9a-zA-Z\-]{10,}/g,
    severity: 'HIGH',
    cvss: 8.2,
    cvssVector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:L/A:N',
    description: 'Slack token exposed. Allows reading private channels, impersonation.',
    remediation: 'Revoke in Slack API dashboard. Use env var, rotate.',
    owasp: 'A07:2021',
    cwe: 'CWE-798',
  },
  {
    id: 'JWT_SECRET',
    name: 'JWT Secret hardcoded',
    regex: /(?:jwt[_-]?secret|JWT_SECRET)\s*[:=]\s*['"][^'"]{8,}['"]/gi,
    severity: 'HIGH',
    cvss: 8.1,
    cvssVector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N',
    description: 'JWT secret hardcoded. Allows forging arbitrary JWTs, auth bypass.',
    remediation: 'Move to env var with 32+ chars random from crypto.randomBytes. Rotate, invalidate existing tokens.',
    owasp: 'A02:2021 — Cryptographic Failures',
    cwe: 'CWE-798',
  },
  {
    id: 'NEXT_PUBLIC_SECRET',
    name: 'NEXT_PUBLIC_ with secret value',
    regex: /NEXT_PUBLIC_(?:.*(?:SECRET|KEY|TOKEN|PASSWORD))?\s*=\s*['\"]?[^'"\s]{8,}['\"]?/gi,
    severity: 'HIGH',
    cvss: 7.5,
    cvssVector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N',
    description: 'NEXT_PUBLIC_ env contains secret. NEXT_PUBLIC_ is bundled to client, exposed to browser.',
    remediation: 'Remove NEXT_PUBLIC_ prefix for server-only secrets. Use server env only, not NEXT_PUBLIC_.',
    owasp: 'A01:2021 — Broken Access Control',
    cwe: 'CWE-200',
  },
  {
    id: 'DATABASE_URL',
    name: 'Database URL with password',
    regex: /(?:postgres|postgresql|mysql|mongodb(?:\+srv)?):\/\/[^:\s]+:([^@\s]+)@[^\s]+/gi,
    severity: 'CRITICAL',
    cvss: 9.0,
    cvssVector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:L',
    description: 'Database connection string with embedded password. DB compromise if repo leaked.',
    remediation: 'Use separate DB_USER, DB_PASSWORD env vars via Secrets Manager. Rotate password. Restrict DB SG.',
    owasp: 'A07:2021',
    cwe: 'CWE-798',
  },
  {
    id: 'GENERIC_API_KEY',
    name: 'Generic API Key assignment',
    regex: /(?:api[_-]?key|apikey)\s*[:=]\s*['"][0-9a-zA-Z\-_]{20,}['"]/gi,
    severity: 'HIGH',
    cvss: 7.5,
    cvssVector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N',
    description: 'Generic API key hardcoded. Third-party abuse, quota theft.',
    remediation: 'Move to env var, use Secrets Manager, rotate key.',
    owasp: 'A07:2021',
    cwe: 'CWE-798',
  },
  {
    id: 'GENERIC_SECRET_ASSIGNMENT',
    name: 'Password / Token in code',
    regex: /(?:password|passwd|secret|token)\s*[:=]\s*['"][^'"]{8,}['"]/gi,
    severity: 'MEDIUM',
    cvss: 6.5,
    cvssVector: 'CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:N/A:N',
    description: 'Potential hardcoded password or token. Context-dependent, needs verification.',
    remediation: 'Verify if real secret. If yes, move to env var + Secrets Manager.',
    owasp: 'A07:2021',
    cwe: 'CWE-798',
  },
  {
    id: 'ENV_FILE_COMMITTED',
    name: '.env file with secrets (should not be committed)',
    regex: /(?:^|\n)(?:[A-Z_]+_(?:KEY|SECRET|TOKEN|PASSWORD)=.+) /,
    severity: 'INFO',
    cvss: 0,
    cvssVector: '',
    description: 'Potential .env committed. Not a secret itself but file should be gitignored.',
    remediation: 'Add .env to .gitignore, remove from repo history if contains real secrets.',
    owasp: 'A01:2021',
    cwe: 'CWE-200',
  },
  {
    id: 'OPENAI_KEY',
    name: 'OpenAI API Key',
    regex: /sk-(?:proj-|)[A-Za-z0-9]{20,}T3BlbkFJ[0-9A-Za-z]{20,}/g,
    severity: 'HIGH',
    cvss: 8.6,
    cvssVector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N',
    description: 'OpenAI API key exposed. Allows usage on attacker behalf, cost fraud.',
    remediation: 'Revoke in OpenAI dashboard, rotate, use env var.',
    owasp: 'A07:2021',
    cwe: 'CWE-798',
  },
  {
    id: 'NPM_TOKEN',
    name: 'NPM Token',
    regex: /npm_[A-Za-z0-9]{36,}/g,
    severity: 'HIGH',
    cvss: 8.1,
    cvssVector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:L/A:N',
    description: 'NPM token exposed. Allows publishing malicious packages under your name.',
    remediation: 'Revoke in npmjs.com, rotate, use fine-grained tokens.',
    owasp: 'A07:2021',
    cwe: 'CWE-798',
  },
  {
    id: 'HIGH_ENTROPY_STRING',
    name: 'High entropy string (possible secret)',
    regex: /['"][A-Za-z0-9/+]{32,}={0,2}['"]/g,
    severity: 'LOW',
    cvss: 3.7,
    cvssVector: 'CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:U/C:L/I:N/A:N',
    description: 'High entropy string detected, might be secret. Low confidence, needs manual review.',
    remediation: 'Verify if secret. If yes, move to env var.',
    owasp: 'A07:2021',
    cwe: 'CWE-798',
  },
];

function shouldIgnore(filePath: string, ignoreList: string[]): boolean {
  const parts = filePath.split(/[\/\\]/);
  return parts.some(p => ignoreList.includes(p));
}

function isProbablyTextFile(filePath: string, maxSize: number): boolean {
  try {
    const stat = statSync(filePath);
    if (!stat.isFile()) return false;
    if (stat.size > maxSize) return false;
    // Quick binary check: extension
    const ext = extname(filePath).toLowerCase();
    // If extension is in deny list of binaries
    const binaryExts = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.ico', '.pdf', '.zip', '.tar', '.gz', '.mp4', '.mp3', '.woff', '.woff2', '.ttf', '.eot', '.exe', '.dll', '.so', '.dylib', '.class', '.pyc'];
    if (binaryExts.includes(ext)) return false;
    return true;
  } catch {
    return false;
  }
}

function walkDir(dir: string, ignore: string[], maxFileSize: number, files: string[] = []): string[] {
  try {
    const entries = readdirSync(dir);
    for (const entry of entries) {
      if (ignore.includes(entry)) continue;
      const full = join(dir, entry);
      try {
        const stat = statSync(full);
        if (stat.isDirectory()) {
          if (shouldIgnore(full, ignore)) continue;
          walkDir(full, ignore, maxFileSize, files);
        } else if (stat.isFile()) {
          if (isProbablyTextFile(full, maxFileSize)) {
            files.push(full);
          }
        }
      } catch {
        continue;
      }
    }
  } catch {
    // ignore unreadable dirs
  }
  return files;
}

export function scanSecrets(targetPath: string, opts: ScanOptions = {}): SecretFinding[] {
  const ignore = [...DEFAULT_IGNORE, ...(opts.ignore || [])];
  const maxFileSize = opts.maxFileSizeBytes || 1_000_000; // 1MB
  const extensions = opts.extensions || [];

  if (!existsSync(targetPath)) {
    throw new Error(`Target path not found: ${targetPath}`);
  }

  const stat = statSync(targetPath);
  let files: string[] = [];
  if (stat.isFile()) {
    files = [targetPath];
  } else if (stat.isDirectory()) {
    files = walkDir(targetPath, ignore, maxFileSize);
    // filter by extensions if provided
    if (extensions.length > 0) {
      files = files.filter(f => {
        const ext = extname(f).toLowerCase();
        const base = f.split('/').pop() || '';
        // allow .env files regardless of ext logic
        if (base.startsWith('.env')) return true;
        return extensions.includes(ext) || extensions.includes(base);
      });
    }
  }

  const findings: SecretFinding[] = [];

  for (const file of files) {
    // Skip huge .env.example? Allow
    let content: string;
    try {
      content = readFileSync(file, 'utf-8');
    } catch {
      continue;
    }
    // Quick skip if file too large after read
    if (content.length > maxFileSize) continue;

    // Special handling for .env file detection
    const baseName = file.split('/').pop() || '';
    if (baseName === '.env' || baseName.startsWith('.env.')) {
      // Check if .env is committed (should be finding INFO if in repo and contains secrets)
      // But actual secret detection will still run via patterns
    }

    const lines = content.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Skip long lines (minified)
      if (line.length > 2000) continue;

      for (const pattern of PATTERNS) {
        // Optimization: quick pre-check for keywords to avoid regex on every line
        // Not applied for generic high entropy to keep simple

        // Reset regex lastIndex for global
        pattern.regex.lastIndex = 0;
        let match: RegExpExecArray | null;
        while ((match = pattern.regex.exec(line)) !== null) {
          const raw = match[0];
          // Avoid duplicate findings same file+line+pattern+match
          // Also skip obvious false positives
          if (raw.length < 8) continue;
          // Skip example / placeholder
          const lower = raw.toLowerCase();
          if (lower.includes('example') || lower.includes('placeholder') || lower.includes('your_') || lower.includes('testkey') || lower.includes('xxx')) {
            continue;
          }
          // Skip if in comment that says "example" and not CRITICAL (to reduce noise)
          if (line.toLowerCase().includes('example') && pattern.severity !== 'CRITICAL') {
            continue;
          }

          const redacted = redactSecret(raw);

          findings.push({
            id: `VULN-${pattern.id}`,
            patternId: pattern.id,
            severity: pattern.severity,
            cvss: pattern.cvss,
            cvssVector: pattern.cvssVector,
            file: file,
            line: i + 1,
            column: match.index,
            match: redacted,
            fullMatch: raw,
            description: pattern.description,
            remediation: pattern.remediation,
            owasp: pattern.owasp,
            cwe: pattern.cwe,
          });

          // Prevent infinite loop for zero-length matches
          if (match[0].length === 0) pattern.regex.lastIndex++;
        }
      }
    }
  }

  // Deduplicate (file+line+patternId)
  const seen = new Set<string>();
  const deduped: SecretFinding[] = [];
  for (const f of findings) {
    const key = `${f.file}:${f.line}:${f.patternId}:${f.match}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(f);
    }
  }

  // Sort by severity: CRITICAL > HIGH > MEDIUM > LOW > INFO
  const order = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3, INFO: 4 } as const;
  deduped.sort((a, b) => {
    const oa = order[a.severity];
    const ob = order[b.severity];
    if (oa !== ob) return oa - ob;
    return a.file.localeCompare(b.file);
  });

  return deduped;
}

export function formatFindingsText(findings: SecretFinding[], target: string): string {
  if (findings.length === 0) {
    return `✅ No secrets found in ${target}\nScanned with ${PATTERNS.length} patterns.\n`;
  }
  const bySeverity: Record<string, number> = {};
  for (const f of findings) {
    bySeverity[f.severity] = (bySeverity[f.severity] || 0) + 1;
  }
  let out = `🔍 Secrets scan results for ${target}\n`;
  out += `Total findings: ${findings.length}\n`;
  out += `Breakdown: ${Object.entries(bySeverity).map(([k,v]) => `${k}:${v}`).join(' ')}\n\n`;
  for (const f of findings) {
    const icon = f.severity === 'CRITICAL' ? '🔴' : f.severity === 'HIGH' ? '🟠' : f.severity === 'MEDIUM' ? '🟡' : f.severity === 'LOW' ? '🟢' : 'ℹ️';
    out += `${icon} [${f.severity}] ${f.patternId} — ${f.file}:${f.line}\n`;
    out += `   Match: ${f.match}\n`;
    out += `   CVSS: ${f.cvss} ${f.cvssVector}\n`;
    out += `   Fix: ${f.remediation.split('.')[0]}.\n\n`;
  }
  return out;
}

export function formatFindingsJson(findings: SecretFinding[]) {
  return findings.map(f => ({
    id: f.id,
    patternId: f.patternId,
    severity: f.severity,
    cvss: f.cvss,
    cvssVector: f.cvssVector,
    file: f.file,
    line: f.line,
    match: f.match,
    description: f.description,
    remediation: f.remediation,
    owasp: f.owasp,
    cwe: f.cwe,
  }));
}

export { PATTERNS };
