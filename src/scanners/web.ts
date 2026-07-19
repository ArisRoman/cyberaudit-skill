import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { Severity } from './types.js';

export interface WebFinding {
  id: string;
  patternId: string;
  severity: Severity;
  cvss: number;
  cvssVector: string;
  file: string;
  line: number;
  column?: number;
  match: string;
  description: string;
  remediation: string;
  owasp: string;
  cwe: string;
  framework?: string;
}

type WebPattern = {
  id: string;
  name: string;
  // For regex patterns, we check line by line; for file-level, we check whole file
  regex?: RegExp;
  fileRegex?: RegExp; // checks entire file content
  severity: Severity;
  cvss: number;
  cvssVector: string;
  description: string;
  remediation: string;
  owasp: string;
  cwe: string;
  // optional filter: only apply to certain extensions or if file contains keyword
  extensions?: string[];
  mustContain?: string[]; // file must contain at least one of these to be considered
  falsePositiveIfContains?: string[]; // if file contains these, skip (mitigation present)
};

const IGNORE_DIRS = ['node_modules', '.git', 'dist', 'build', '.next', '.nuxt', 'coverage', '.cache', 'vendor', 'out'];

function shouldIgnoreDir(name: string): boolean {
  return IGNORE_DIRS.includes(name);
}

function walkFiles(dir: string, exts: string[], maxSize = 1_000_000): string[] {
  const files: string[] = [];
  const walk = (d: string) => {
    try {
      const entries = readdirSync(d);
      for (const e of entries) {
        if (shouldIgnoreDir(e)) continue;
        const full = join(d, e);
        try {
          const st = statSync(full);
          if (st.isDirectory()) walk(full);
          else if (st.isFile()) {
            if (st.size > maxSize) continue;
            const ext = extname(full).toLowerCase();
            // Allow .js, .ts, .jsx, .tsx, .vue, .php, .py etc
            if (exts.length === 0 || exts.includes(ext) || full.endsWith('.js') || full.endsWith('.ts')) {
              // Quick binary skip
              if (['.png','.jpg','.jpeg','.gif','.ico','.pdf','.zip','.woff','.woff2'].includes(ext)) continue;
              files.push(full);
            }
          }
        } catch {}
      }
    } catch {}
  };
  walk(dir);
  return files;
}

const WEB_PATTERNS: WebPattern[] = [
  {
    id: 'WEB_SQLI_CONCAT',
    name: 'SQL Injection via string concatenation / template literal',
    regex: /(?:db|pool|connection|client)\.(?:query|execute)\s*\(\s*["'`].*\+.*req\.|(?:query|execute)\s*\(\s*`[^`]*\$\{[^}]*req\.[^}]*\}[^`]*`/gi,
    severity: 'CRITICAL',
    cvss: 9.8,
    cvssVector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H',
    description: 'SQL query built via string concatenation or template literal with user input (req.*). Classic SQLi.',
    remediation: 'Use parameterized queries: db.query("SELECT * FROM users WHERE id = ?", [id]) or ORM safe methods. Never interpolate user input.',
    owasp: 'A03:2021 — Injection',
    cwe: 'CWE-89',
    extensions: ['.js','.ts','.jsx','.tsx','.php'],
  },
  {
    id: 'WEB_SQLI_RAW',
    name: 'SQL Injection via raw query with interpolation',
    regex: /(?:SELECT|INSERT|UPDATE|DELETE).*\+.*req\.(?:body|query|params)\./gi,
    severity: 'CRITICAL',
    cvss: 9.8,
    cvssVector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H',
    description: 'Raw SQL contains req.body/query/params concatenation.',
    remediation: 'Use prepared statements / ORM. Validate whitelist for ORDER BY / table names.',
    owasp: 'A03:2021',
    cwe: 'CWE-89',
  },
  {
    id: 'WEB_XSS_DANGEROUS',
    name: 'XSS via dangerouslySetInnerHTML without DOMPurify',
    regex: /dangerouslySetInnerHTML\s*=\s*\{\{\s*__html\s*:\s*[^}]*\}/g,
    severity: 'HIGH',
    cvss: 7.5,
    cvssVector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N',
    description: 'React dangerouslySetInnerHTML used. If user input reaches it without sanitization, XSS.',
    remediation: 'Use DOMPurify: import DOMPurify from "dompurify"; <div dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(userInput)}} /> or avoid innerHTML.',
    owasp: 'A03:2021',
    cwe: 'CWE-79',
    falsePositiveIfContains: ['DOMPurify', 'sanitize'],
  },
  {
    id: 'WEB_XSS_INNERHTML',
    name: 'XSS via innerHTML assignment',
    regex: /(?:\.innerHTML\s*=|v-html\s*=|{{\s*.*\s*\|\s*safe}})/g,
    severity: 'HIGH',
    cvss: 7.2,
    cvssVector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:L/A:N',
    description: 'Direct innerHTML assignment or v-html without sanitization.',
    remediation: 'Escape output, use textContent, or sanitize with DOMPurify / HTMLPurifier.',
    owasp: 'A03:2021',
    cwe: 'CWE-79',
  },
  {
    id: 'WEB_JWT_DECODE',
    name: 'JWT decode without verify (auth bypass)',
    regex: /jwt\.decode\s*\(/g,
    severity: 'HIGH',
    cvss: 8.1,
    cvssVector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N',
    description: 'jwt.decode() used instead of jwt.verify(). decode does NOT validate signature, allows forged tokens.',
    remediation: 'Use jwt.verify(token, secret, {algorithms: ["HS256"]}) and explicitly set algorithm. Never trust decode.',
    owasp: 'A02:2021 — Cryptographic Failures',
    cwe: 'CWE-345',
    falsePositiveIfContains: ['jwt.verify'],
  },
  {
    id: 'WEB_CORS_WILDCARD',
    name: 'CORS wildcard with credentials',
    regex: /(?:origin\s*:\s*['"]\*['"]|Access-Control-Allow-Origin.*\*|cors\(\s*\{\s*origin\s*:\s*true)/gi,
    severity: 'MEDIUM',
    cvss: 6.5,
    cvssVector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N',
    description: 'CORS configured with wildcard origin. If credentials:true, allows any site to read authenticated responses.',
    remediation: 'Whitelist explicit origins: cors({origin: ["https://app.example.com"], credentials:true}). Never * with credentials.',
    owasp: 'A01:2021 — Broken Access Control',
    cwe: 'CWE-942',
  },
  {
    id: 'WEB_EXEC_INJECTION',
    name: 'Command injection via exec / spawn with user input',
    regex: /(?:exec|execSync|spawn|spawnSync)\s*\(\s*[`'"].*\$\{.*req\.|exec\s*\(\s*.*\+.*req\.(?:body|query|params)/g,
    severity: 'CRITICAL',
    cvss: 9.8,
    cvssVector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H',
    description: 'Child process exec with user-controlled input. Leads to RCE.',
    remediation: 'Avoid shell. Use execFile with allowlist, or native libs (e.g., sharp instead of convert). Validate strict whitelist.',
    owasp: 'A03:2021',
    cwe: 'CWE-77',
  },
  {
    id: 'WEB_EVAL',
    name: 'Code injection via eval / Function',
    regex: /(?:\beval\s*\(|new\s+Function\s*\()/g,
    severity: 'CRITICAL',
    cvss: 9.8,
    cvssVector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H',
    description: 'eval() or new Function() with potential user input. Arbitrary code execution.',
    remediation: 'Remove eval. Use JSON.parse, or safe alternatives. If unavoidable, strict allowlist and no user input.',
    owasp: 'A03:2021',
    cwe: 'CWE-95',
  },
  {
    id: 'WEB_MASS_ASSIGNMENT',
    name: 'Mass assignment via req.body directly in create/update',
    regex: /(?:\.create\s*\(\s*req\.body|\.update\s*\(\s*req\.body|\.findOneAndUpdate\s*\(\s*.*req\.body)/g,
    severity: 'HIGH',
    cvss: 8.1,
    cvssVector: 'CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:N',
    description: 'Direct use of req.body in ORM create/update without whitelist. Allows role/balance elevation.',
    remediation: 'Whitelist allowed fields: const {name,email} = req.body; Model.create({name,email}). Use ValidationPipe whitelist:true in NestJS.',
    owasp: 'A03:2021',
    cwe: 'CWE-915',
  },
  {
    id: 'WEB_NOSQL_INJECTION',
    name: 'NoSQL injection via req.body in find',
    regex: /(?:find|findOne)\s*\(\s*\{[^}]*req\.body\./g,
    severity: 'HIGH',
    cvss: 8.2,
    cvssVector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N',
    description: 'NoSQL query uses req.body field directly as filter. If attacker sends {$gt:""} it bypasses auth.',
    remediation: 'Use String(req.body.username) or mongoSanitize. Validate types, strip $ operators.',
    owasp: 'A03:2021',
    cwe: 'CWE-943',
  },
  {
    id: 'WEB_HELMET_MISSING',
    name: 'Express app without helmet (missing security headers)',
    fileRegex: /express\s*\(\)/,
    severity: 'LOW',
    cvss: 3.7,
    cvssVector: 'CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:U/C:L/I:N/A:N',
    description: 'Express app detected but helmet middleware not used. Missing CSP, HSTS, X-Frame, etc.',
    remediation: 'Add helmet: import helmet from "helmet"; app.use(helmet()); Configure CSP.',
    owasp: 'A05:2021 — Security Misconfiguration',
    cwe: 'CWE-693',
    mustContain: ['express'],
    falsePositiveIfContains: ['helmet'],
  },
  {
    id: 'WEB_LARAVEL_DEBUG',
    name: 'Laravel APP_DEBUG true in production example or .env',
    regex: /APP_DEBUG\s*=\s*true/gi,
    severity: 'MEDIUM',
    cvss: 5.3,
    cvssVector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N',
    description: 'APP_DEBUG=true exposes stack traces, env vars.',
    remediation: 'Set APP_DEBUG=false in production, APP_ENV=production. Ensure .env not committed.',
    owasp: 'A05:2021',
    cwe: 'CWE-215',
  },
];

export function scanWeb(targetPath: string): WebFinding[] {
  if (!existsSync(targetPath)) throw new Error(`Target not found: ${targetPath}`);
  const stat = statSync(targetPath);
  let files: string[] = [];
  if (stat.isFile()) files = [targetPath];
  else files = walkFiles(targetPath, ['.js','.ts','.jsx','.tsx','.vue','.php','.py','.go','.java']);

  const findings: WebFinding[] = [];

  for (const file of files) {
    let content: string;
    try {
      content = readFileSync(file, 'utf-8');
    } catch { continue; }
    if (content.length > 1_000_000) continue;
    const lines = content.split(/\r?\n/);

    for (const pattern of WEB_PATTERNS) {
      // Extension filter
      if (pattern.extensions && pattern.extensions.length > 0) {
        const ext = file.slice(file.lastIndexOf('.')).toLowerCase();
        if (!pattern.extensions.includes(ext) && !pattern.extensions.some(e => file.endsWith(e))) {
          // allow if file contains mustContain anyway? Skip strict
          if (!pattern.mustContain) continue;
        }
      }
      // mustContain filter
      if (pattern.mustContain && !pattern.mustContain.some(k => content.includes(k))) continue;
      // false positive mitigation present
      if (pattern.falsePositiveIfContains && pattern.falsePositiveIfContains.some(k => content.includes(k))) {
        // For some patterns, we still want to report if mitigation not on same line? For simplicity skip file-level
        // But for line-level, we check per line later; here we skip only for fileRegex patterns
        if (pattern.fileRegex) continue;
      }

      if (pattern.fileRegex) {
        pattern.fileRegex.lastIndex = 0;
        if (pattern.fileRegex.test(content)) {
          // Find line of first match for file-level
          const match = content.match(pattern.fileRegex);
          let lineNum = 1;
          if (match && match.index !== undefined) {
            const before = content.slice(0, match.index);
            lineNum = before.split('\n').length;
          }
          findings.push({
            id: `VULN-${pattern.id}`,
            patternId: pattern.id,
            severity: pattern.severity,
            cvss: pattern.cvss,
            cvssVector: pattern.cvssVector,
            file,
            line: lineNum,
            match: match ? match[0].slice(0, 120) : pattern.id,
            description: pattern.description,
            remediation: pattern.remediation,
            owasp: pattern.owasp,
            cwe: pattern.cwe,
          });
        }
        continue;
      }

      if (!pattern.regex) continue;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.length > 2000) continue;
        pattern.regex.lastIndex = 0;
        let m: RegExpExecArray | null;
        while ((m = pattern.regex.exec(line)) !== null) {
          const raw = m[0];
          if (raw.length < 4) continue;
          // Skip if mitigation on same line
          if (pattern.falsePositiveIfContains && pattern.falsePositiveIfContains.some(k => line.includes(k))) {
            // if mitigation present on same line, skip
            continue;
          }
          findings.push({
            id: `VULN-${pattern.id}`,
            patternId: pattern.id,
            severity: pattern.severity,
            cvss: pattern.cvss,
            cvssVector: pattern.cvssVector,
            file,
            line: i + 1,
            column: m.index,
            match: raw.slice(0, 200),
            description: pattern.description,
            remediation: pattern.remediation,
            owasp: pattern.owasp,
            cwe: pattern.cwe,
          });
          if (m[0].length === 0) pattern.regex.lastIndex++;
        }
      }
    }
  }

  const seen = new Set<string>();
  const deduped: WebFinding[] = [];
  for (const f of findings) {
    const key = `${f.file}:${f.line}:${f.patternId}:${f.match}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(f);
    }
  }

  const order = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3, INFO: 4 } as const;
  deduped.sort((a, b) => order[a.severity] - order[b.severity] || a.file.localeCompare(b.file));

  return deduped;
}

export function formatWebFindingsText(findings: WebFinding[], target: string): string {
  if (findings.length === 0) {
    return `✅ No web vulnerabilities found in ${target}\nChecked ${WEB_PATTERNS.length} patterns.\n`;
  }
  const bySev: Record<string, number> = {};
  findings.forEach(f => bySev[f.severity] = (bySev[f.severity] || 0) + 1);
  let out = `🕷️ Web scan results for ${target}\nTotal: ${findings.length} | ${Object.entries(bySev).map(([k,v])=>`${k}:${v}`).join(' ')}\n\n`;
  for (const f of findings) {
    const icon = f.severity === 'CRITICAL' ? '🔴' : f.severity === 'HIGH' ? '🟠' : f.severity === 'MEDIUM' ? '🟡' : '🟢';
    out += `${icon} [${f.severity}] ${f.patternId} — ${f.file}:${f.line}\n`;
    out += `   Match: ${f.match}\n`;
    out += `   CVSS: ${f.cvss} ${f.cvssVector}\n`;
    out += `   Fix: ${f.remediation.split('.')[0]}.\n\n`;
  }
  return out;
}

export { WEB_PATTERNS };
