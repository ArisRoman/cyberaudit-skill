# ⚡ CYBERAUDIT SKILL — COMMAND ROUTER
# The central router for all available commands

═══════════════════════════════════════════════════════════════
  AGENT USAGE:
  This file is your command dictionary.
  When you receive a /audit:xxx command, you read here
  exactly which files to load and which behavior to adopt.
  You NEVER deviate from this router.
═══════════════════════════════════════════════════════════════

═══════════════════════════════════════════════════════════════
              COMMAND INDEX
═══════════════════════════════════════════════════════════════

  GLOBAL COMMANDS
  ───────────────
  /audit                  → Full automatic audit
  /audit:quick            → Quick scan — criticals only
  /audit:report           → Generate the full report
  /audit:exec             → Generate the executive summary
  /audit:help             → Show this help

  WEB COMMANDS
  ────────────
  /audit:web              → Full web audit
  /audit:auth             → Authentication & Authorization
  /audit:injection        → All injections (SQL, NoSQL, Cmd...)
  /audit:xss              → Cross-Site Scripting
  /audit:csrf             → Cross-Site Request Forgery
  /audit:cors             → CORS configuration
  /audit:headers          → HTTP security headers
  /audit:secrets          → Exposed secrets and credentials
  /audit:deps             → Dependencies and supply chain
  /audit:ssrf             → Server-Side Request Forgery
  /audit:idor             → IDOR and access control
  /audit:logic            → Business logic
  /audit:crypto           → Web cryptography
  /audit:xxe              → XML External Entities
  /audit:deserial         → Insecure deserialization

  WEB FRAMEWORK COMMANDS
  ───────────────────────
  /audit:laravel          → Full Laravel audit
  /audit:nextjs           → Full Next.js audit
  /audit:react            → Full React audit
  /audit:nestjs           → Full NestJS audit
  /audit:express          → Full Express audit
  /audit:vue              → Full Vue.js audit
  /audit:angular          → Full Angular audit

  MOBILE COMMANDS
  ───────────────
  /audit:mobile           → Full mobile audit
  /audit:storage          → Mobile local storage
  /audit:network          → Mobile network security
  /audit:binary           → Binary analysis
  /audit:permissions      → Permissions audit
  /audit:deeplinks        → Deep links and IPC
  /audit:auth-mobile      → Mobile auth
  /audit:crypto-mobile    → Mobile cryptography
  /audit:runtime          → Mobile runtime security

  MOBILE FRAMEWORK COMMANDS
  ──────────────────────────
  /audit:react-native     → Full React Native audit
  /audit:flutter          → Full Flutter audit
  /audit:ionic            → Full Ionic audit
  /audit:expo             → Full Expo audit

  COMPLIANCE COMMANDS
  ────────────────────
  /audit:rgpd             → RGPD compliance check
  /audit:pci              → PCI-DSS compliance check
  /audit:hipaa            → HIPAA compliance check
  /audit:masvs            → Full MASVS 2.0 score
  /audit:owasp            → OWASP Top 10 score

═══════════════════════════════════════════════════════════════
              COMMAND DEFINITIONS
═══════════════════════════════════════════════════════════════

Each command defines:
  LOAD      → Files to load into context
  BEHAVIOR  → What the agent must do exactly
  OUTPUT    → Expected output format
  SCOPE     → What is analyzed

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/audit
──────
  ALIAS: /audit:full, /audit:all

  LOAD:
    → AGENT-BOOT.md
    → MASTER.md
    → shared/SEVERITY-SCORING.md
    → shared/OWASP-MAPPER.md
    → shared/COMPLIANCE.md
    → [Auto-detect the framework and load the corresponding .md]
    → [If web detected]   web/WEB-PHILOSOPHY.md
                          web/WEB-CHECKLIST.md
                          web/WEB-THREAT-MODELS.md
    → [If mobile detected] mobile/MOBILE-PHILOSOPHY.md
                           mobile/MOBILE-CHECKLIST.md
                           mobile/MOBILE-THREAT-MODELS.md
    → reports/REPORT-TEMPLATE-WEB.md or REPORT-TEMPLATE-MOBILE.md

  BEHAVIOR:
    1. Auto-detect the framework from the submitted code
    2. Execute all audit phases in order
    3. Cover 100% of the applicable checklist
    4. Document each finding with the standard format
    5. Calculate the overall score
    6. Produce the full report

  OUTPUT:
    → Complete formatted audit report
    → Security score /100
    → Go/No-Go verdict
    → Prioritized remediation plan

  SCOPE:
    → All submitted code or the specified directory
    → All vulnerability categories
    → All phases: Secrets → Auth → Authz → Injection
      → XSS → Config → Deps → Infra

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/audit:quick
────────────
  ALIAS: /audit:scan, /audit:fast

  LOAD:
    → AGENT-BOOT.md
    → MASTER.md
    → shared/SEVERITY-SCORING.md
    → web/vulnerabilities/SECRETS.md (always)
    → [Auto-detected framework]

  BEHAVIOR:
    1. Scan CRITICAL and HIGH vulnerabilities ONLY
    2. Absolute priority: exposed secrets first
    3. Then: auth bypass, injection, IDOR
    4. Stop as soon as criticals are identified
    5. No full report — direct findings list

  OUTPUT:
    → Concise list: ID / Severity / File:Line / Title
    → No full report
    → Immediate verdict: BLOCKED / WARNING / OK
    → Fast response time

  SCOPE:
    → CRITICAL and HIGH only
    → No MEDIUM, LOW, INFO
    → Ideal for: pre-commit hook, quick PR review

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/audit:web
──────────
  ALIAS: /audit:webapp

  LOAD:
    → AGENT-BOOT.md
    → MASTER.md
    → web/WEB-PHILOSOPHY.md
    → web/WEB-CHECKLIST.md
    → web/WEB-THREAT-MODELS.md
    → shared/SEVERITY-SCORING.md
    → shared/OWASP-MAPPER.md
    → [Web framework detected: load the corresponding .md]
    → web/WEB-REMEDIATION-LIBRARY.md
    → reports/REPORT-TEMPLATE-WEB.md

  BEHAVIOR:
    1. Apply the complete web philosophy (7 pillars)
    2. Execute all 7 web audit phases in order
    3. Cover all 14 sections of WEB-CHECKLIST
    4. Map each finding to OWASP Top 10 2023
    5. Produce the full web report

  OUTPUT:
    → Full web report with OWASP score
    → OWASP Top 10 conformity item by item

  SCOPE:
    → Web backend + frontend code
    → Server configuration if available
    → npm/composer dependencies

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/audit:mobile
─────────────
  ALIAS: /audit:app, /audit:mobileapp

  LOAD:
    → AGENT-BOOT.md
    → MASTER.md
    → mobile/MOBILE-PHILOSOPHY.md
    → mobile/MOBILE-CHECKLIST.md
    → mobile/MOBILE-THREAT-MODELS.md
    → shared/SEVERITY-SCORING.md
    → shared/OWASP-MAPPER.md
    → [Mobile framework detected: load the corresponding .md]
    → mobile/MOBILE-REMEDIATION-LIBRARY.md
    → reports/REPORT-TEMPLATE-MOBILE.md

  BEHAVIOR:
    1. Apply the 8 mobile commandments
    2. Simulate the 5 mobile attack scenarios
    3. Execute all 6 mobile audit phases in order
    4. Map each finding to MASVS 2.0
    5. Produce the full mobile report

  OUTPUT:
    → Full mobile report with MASVS score
    → MASVS 2.0 conformity control by control
    → Score per platform (Android / iOS)

  SCOPE:
    → Mobile app source code
    → AndroidManifest.xml and Info.plist if available
    → Network configuration
    → Dependencies

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/audit:auth
───────────
  ALIAS: /audit:authentication, /audit:authz

  LOAD:
    → AGENT-BOOT.md
    → MASTER.md
    → web/vulnerabilities/AUTH-AUTHZ.md
    → shared/SEVERITY-SCORING.md

  BEHAVIOR:
    1. Analyze EXCLUSIVELY the authentication system
    2. Analyze EXCLUSIVELY the authorization system
    3. Cover: JWT, sessions, OAuth, MFA, RBAC, IDOR
    4. Mentally test each auth flow
    5. Identify possible bypasses

  OUTPUT:
    → Auth/authz findings only
    → Authentication score /100
    → Auth architecture recommendations

  SCOPE:
    → Auth files, middleware, guards
    → Protected routes and their protection
    → Session and token management
    → Permission and role system

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/audit:injection
────────────────
  ALIAS: /audit:sqli, /audit:inject

  LOAD:
    → AGENT-BOOT.md
    → MASTER.md
    → web/vulnerabilities/INJECTION.md
    → shared/SEVERITY-SCORING.md

  BEHAVIOR:
    1. Scan all forms of injection
    2. SQL, NoSQL, Command, LDAP, XPath, SSTI, ORM
    3. Trace each user input to its usage
    4. Identify non-parameterized queries
    5. Check ORMs for raw queries

  OUTPUT:
    → Complete list of injection points found
    → Fixed code for each finding
    → Risk level per injection

  SCOPE:
    → All database queries
    → All system calls
    → All template renderings
    → All XML/HTML parsers

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/audit:xss
──────────
  LOAD:
    → AGENT-BOOT.md
    → MASTER.md
    → web/vulnerabilities/XSS.md
    → shared/SEVERITY-SCORING.md

  BEHAVIOR:
    1. Scan all data output points
    2. Identify unescaped outputs
    3. Check CSP presence and effectiveness
    4. Analyze uses of dangerouslySetInnerHTML, innerHTML
    5. Verify Content-Type headers

  OUTPUT:
    → XSS findings (reflected, stored, DOM-based)
    → Evaluation of existing CSP
    → Encoding recommendations

  SCOPE:
    → All HTML/JS outputs
    → Frontend templates and components
    → Content-Type and CSP headers

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/audit:csrf
───────────
  LOAD:
    → AGENT-BOOT.md
    → MASTER.md
    → web/vulnerabilities/CSRF.md
    → shared/SEVERITY-SCORING.md

  BEHAVIOR:
    1. Check CSRF token presence on all forms
    2. Check server-side token validation
    3. Analyze SameSite cookies
    4. Verify webhook protection (HMAC)
    5. Identify sensitive endpoints without protection

  OUTPUT:
    → CSRF findings per endpoint
    → SameSite protection status
    → Framework-specific recommendations

  SCOPE:
    → All POST/PUT/DELETE forms
    → Cookie configuration
    → Incoming webhooks

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/audit:cors
───────────
  LOAD:
    → AGENT-BOOT.md
    → MASTER.md
    → web/vulnerabilities/CORS.md
    → shared/SEVERITY-SCORING.md

  BEHAVIOR:
    1. Analyze the complete CORS configuration
    2. Detect overly permissive origins (wildcard)
    3. Check credentials + wildcard combination
    4. Analyze allowed methods and headers
    5. Verify preflight handling

  OUTPUT:
    → Current vs recommended CORS configuration
    → Risks per CORS endpoint
    → Corrected configuration ready to use

  SCOPE:
    → Server CORS configuration
    → CORS middleware
    → Access-Control-* headers

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/audit:headers
──────────────
  ALIAS: /audit:securityheaders, /audit:http-headers

  LOAD:
    → AGENT-BOOT.md
    → MASTER.md
    → web/vulnerabilities/HEADERS.md
    → shared/SEVERITY-SCORING.md

  BEHAVIOR:
    1. Check each security header's presence
    2. Evaluate CSP configuration quality
    3. Check HSTS (duration, includeSubDomains, preload)
    4. Identify information-revealing headers
    5. Provide the complete corrected configuration

  OUTPUT:
    → Table: Header / Status / Current value / Recommended value
    → Headers score /100
    → Complete configuration ready to copy-paste

  SCOPE:
    → Web server configuration
    → Header middleware
    → Framework configuration (next.config.js, etc.)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/audit:secrets
──────────────
  ALIAS: /audit:credentials, /audit:leaks

  LOAD:
    → AGENT-BOOT.md
    → MASTER.md
    → web/vulnerabilities/SECRETS.md
    → shared/SEVERITY-SCORING.md

  BEHAVIOR:
    1. Scan ALL files for secret patterns
    2. AWS keys, API keys, JWT secrets, DB URLs, private keys
    3. Check committed .env files
    4. Check comments and test files
    5. Check NEXT_PUBLIC_ variables exposing secrets
    6. Mask found secrets in the report (show ***)

  OUTPUT:
    → List of found secrets (masked) with location
    → Severity by secret type
    → Rotation instructions for each found secret

  SCOPE:
    → All project files without exception
    → Git history if accessible
    → Configuration files and .env

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/audit:deps
───────────
  ALIAS: /audit:dependencies, /audit:supply-chain

  LOAD:
    → AGENT-BOOT.md
    → MASTER.md
    → web/vulnerabilities/SUPPLY-CHAIN.md
    → shared/SEVERITY-SCORING.md

  BEHAVIOR:
    1. Analyze package.json / composer.json / pubspec.yaml
    2. Identify packages with known CVEs
    3. Identify abandoned or unmaintained packages
    4. Check for lock files presence
    5. Detect suspicious packages (typosquatting)
    6. Check main framework versions

  OUTPUT:
    → List of vulnerable dependencies with CVEs
    → Supply chain risk score
    → Recommended update commands

  SCOPE:
    → package.json / package-lock.json / yarn.lock
    → composer.json / composer.lock
    → pubspec.yaml / pubspec.lock
    → requirements.txt if Python

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/audit:ssrf
───────────
  LOAD:
    → AGENT-BOOT.md
    → MASTER.md
    → web/vulnerabilities/SSRF.md
    → shared/SEVERITY-SCORING.md

  BEHAVIOR:
    1. Identify all places where the app makes HTTP requests
    2. Check if URLs come from user input
    3. Analyze imports, webhooks, URL fetches
    4. Check protection against internal IPs
    5. Check protection against cloud metadata endpoints

  OUTPUT:
    → SSRF findings per entry point
    → Outbound request mapping
    → Recommended whitelist

  SCOPE:
    → All outbound HTTP requests from the app
    → External resource imports
    → Webhooks and callbacks

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/audit:idor
───────────
  ALIAS: /audit:bola, /audit:access-control

  LOAD:
    → AGENT-BOOT.md
    → MASTER.md
    → web/vulnerabilities/IDOR-BOLA.md
    → shared/SEVERITY-SCORING.md

  BEHAVIOR:
    1. Identify all object accesses by ID
    2. Verify ownership is checked server-side
    3. Analyze if IDs are predictable (sequential)
    4. Check RBAC on sensitive functions
    5. Detect mass assignment on sensitive fields

  OUTPUT:
    → IDOR findings per endpoint
    → Map of accesses without ownership verification
    → RBAC recommendations

  SCOPE:
    → All endpoints with :id parameter
    → All user resource accesses
    → Permission and role system

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/audit:logic
────────────
  ALIAS: /audit:business, /audit:workflow

  LOAD:
    → AGENT-BOOT.md
    → MASTER.md
    → web/vulnerabilities/BUSINESS-LOGIC.md
    → shared/SEVERITY-SCORING.md

  BEHAVIOR:
    1. Analyze business flows (payment, order, signup)
    2. Look for race conditions on critical operations
    3. Verify prices/amounts are calculated server-side
    4. Check state transitions in workflows
    5. Test edge cases (negative, zero, extreme values)
    6. Identify abusable features

  OUTPUT:
    → Business logic findings with exploit scenario
    → Recommended test cases
    → Fixes with DB atomicity

  SCOPE:
    → Payment, order, account controllers
    → Multi-step workflows
    → All monetary operations

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/audit:crypto
─────────────
  ALIAS: /audit:cryptography, /audit:encryption

  LOAD:
    → AGENT-BOOT.md
    → MASTER.md
    → shared/CVSS-GUIDE.md
    → shared/SEVERITY-SCORING.md

  BEHAVIOR:
    1. Identify all cryptographic algorithms used
    2. Detect MD5, SHA1, DES, RC4, weak algorithms
    3. Check password hashing (bcrypt/argon2)
    4. Analyze encryption key management
    5. Verify cryptographic random generation
    6. Analyze TLS/SSL configuration

  OUTPUT:
    → Complete cryptographic inventory
    → Findings per detected weak algorithm
    → Recommended replacement algorithms

  SCOPE:
    → All code handling encrypted data
    → TLS configuration
    → Password hashing

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/audit:xxe
──────────
  LOAD:
    → AGENT-BOOT.md
    → MASTER.md
    → web/vulnerabilities/XXE.md
    → shared/SEVERITY-SCORING.md

  BEHAVIOR:
    1. Identify all XML parsers in the application
    2. Verify external entities are disabled
    3. Analyze accepted SVG/XML uploads
    4. Check XML libraries used and their config

  OUTPUT:
    → XXE findings per identified parser
    → Secure configuration for each library

  SCOPE:
    → XML, SVG, RSS, SOAP parsers
    → Endpoints accepting XML

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/audit:deserial
───────────────
  ALIAS: /audit:deserialization

  LOAD:
    → AGENT-BOOT.md
    → MASTER.md
    → web/vulnerabilities/DESERIALIZATION.md
    → shared/SEVERITY-SCORING.md

  BEHAVIOR:
    1. Identify all uses of unserialize() / deserialize()
    2. Check if user data is being deserialized
    3. Analyze encrypted cookies (gadget chains)
    4. Check formats: PHP serialize, Java serialization,
       Python pickle, dangerous YAML.load

  OUTPUT:
    → Deserialization findings per entry point
    → Recommended secure alternatives (JSON)

  SCOPE:
    → All deserialization operations
    → Cookies, sessions, cache data

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/audit:storage
──────────────
  ALIAS: /audit:mobile-storage, /audit:local-storage

  LOAD:
    → AGENT-BOOT.md
    → MASTER.md
    → mobile/vulnerabilities/STORAGE.md
    → shared/SEVERITY-SCORING.md

  BEHAVIOR:
    1. Scan all AsyncStorage / SharedPreferences usage
    2. Check Keychain / Keystore usage
    3. Analyze local databases (encrypted?)
    4. Check sensitive local files
    5. Check HTTP cache
    6. Analyze backup policy

  OUTPUT:
    → Storage findings per mechanism
    → Recommended migration to Keychain/Keystore
    → Complete replacement code

  SCOPE:
    → AsyncStorage, MMKV, SQLite
    → Keychain, Keystore
    → Local files and cache

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/audit:network
──────────────
  ALIAS: /audit:mobile-network, /audit:pinning

  LOAD:
    → AGENT-BOOT.md
    → MASTER.md
    → mobile/vulnerabilities/NETWORK-MOBILE.md
    → shared/SEVERITY-SCORING.md

  BEHAVIOR:
    1. Check certificate pinning presence
    2. Analyze Network Security Config (Android)
    3. Analyze App Transport Security (iOS)
    4. Detect hardcoded HTTP URLs
    5. Check backup pins
    6. Analyze TLS configuration

  OUTPUT:
    → Certificate pinning status
    → Network findings per platform
    → Complete NSC / ATS configuration

  SCOPE:
    → Android and iOS network configuration
    → All HTTP/HTTPS requests from the app
    → Network libraries used

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/audit:binary
─────────────
  ALIAS: /audit:reverse, /audit:hardcoded

  LOAD:
    → AGENT-BOOT.md
    → MASTER.md
    → mobile/vulnerabilities/BINARY-ANALYSIS.md
    → shared/SEVERITY-SCORING.md

  BEHAVIOR:
    1. Scan all hardcoded secrets in code
    2. Check obfuscation is enabled
    3. Analyze exposed strings (endpoints, keys)
    4. Check debug mode in release build
    5. Analyze embedded certificates

  OUTPUT:
    → Hardcoded secrets found (masked)
    → Obfuscation status
    → Binary hardening recommendations

  SCOPE:
    → All app source code
    → Build configuration (ProGuard, R8, Hermes)
    → Configuration files

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/audit:permissions
──────────────────
  ALIAS: /audit:perms

  LOAD:
    → AGENT-BOOT.md
    → MASTER.md
    → mobile/vulnerabilities/PERMISSIONS.md
    → shared/SEVERITY-SCORING.md

  BEHAVIOR:
    1. List all declared permissions
    2. Check justification for each permission
    3. Identify unnecessary or excessive permissions
    4. Check request timing (on-demand vs on-startup)
    5. Check user denial handling

  OUTPUT:
    → Table of all permissions with justification
    → Permissions to remove
    → Permissions to justify

  SCOPE:
    → AndroidManifest.xml
    → Info.plist
    → Permission request code

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/audit:deeplinks
────────────────
  ALIAS: /audit:ipc, /audit:intents, /audit:urlschemes

  LOAD:
    → AGENT-BOOT.md
    → MASTER.md
    → mobile/vulnerabilities/IPC-DEEPLINKS.md
    → shared/SEVERITY-SCORING.md

  BEHAVIOR:
    1. Identify all declared deep links and URL schemes
    2. Analyze received parameter validation
    3. Check auth before sensitive actions
    4. Analyze exported Intents (Android)
    5. Analyze WebView bridges

  OUTPUT:
    → Deep link mapping
    → Findings per unsecured deep link
    → Complete validation code

  SCOPE:
    → AndroidManifest.xml intent-filters
    → Info.plist URL types
    → Deep link handling code

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/audit:runtime
──────────────
  ALIAS: /audit:antifraud, /audit:resilience

  LOAD:
    → AGENT-BOOT.md
    → MASTER.md
    → mobile/vulnerabilities/RUNTIME-MOBILE.md
    → shared/SEVERITY-SCORING.md

  BEHAVIOR:
    1. Check root/jailbreak detection
    2. Analyze anti-debug protections
    3. Check logs in production mode
    4. Analyze anti-tampering protections
    5. Check background masking

  OUTPUT:
    → Runtime protections status
    → MASVS resilience level
    → Recommended implementations

  SCOPE:
    → Root/jailbreak detection code
    → Release build configuration
    → App lifecycle management

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/audit:laravel
──────────────
  LOAD:
    → AGENT-BOOT.md
    → MASTER.md
    → web/WEB-PHILOSOPHY.md
    → web/WEB-CHECKLIST.md
    → web/frameworks/LARAVEL.md
    → web/vulnerabilities/INJECTION.md
    → web/vulnerabilities/AUTH-AUTHZ.md
    → web/vulnerabilities/IDOR-BOLA.md
    → shared/SEVERITY-SCORING.md
    → shared/OWASP-MAPPER.md
    → reports/REPORT-TEMPLATE-WEB.md

  BEHAVIOR:
    1. Apply the complete Laravel threat model
    2. Scan the 13 Laravel vulnerable patterns
    3. Check the 7 Laravel attack layers
    4. Cover the complete Laravel checklist
    5. Produce a report with Laravel-specific remediation

  OUTPUT:
    → Complete Laravel audit report
    → Fix code in Laravel/Eloquent/Blade syntax

  SCOPE:
    → Controllers, Models, Migrations
    → Routes, Middleware, Policies
    → Blade templates
    → Laravel configuration

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/audit:nextjs
─────────────
  LOAD:
    → AGENT-BOOT.md
    → MASTER.md
    → web/WEB-PHILOSOPHY.md
    → web/WEB-CHECKLIST.md
    → web/frameworks/NEXTJS.md
    → web/vulnerabilities/SECRETS.md
    → web/vulnerabilities/AUTH-AUTHZ.md
    → shared/SEVERITY-SCORING.md
    → shared/OWASP-MAPPER.md
    → reports/REPORT-TEMPLATE-WEB.md

  BEHAVIOR:
    1. Apply the Next.js threat model (client/server duality)
    2. Check NEXT_PUBLIC_ exposing secrets
    3. Analyze Server Actions, API Routes, Middleware
    4. Check client/server context confusion
    5. Analyze next.config.js

  OUTPUT:
    → Complete Next.js audit report
    → Fix code in Next.js/React syntax

  SCOPE:
    → app/ or pages/ directory
    → API routes
    → Middleware
    → next.config.js
    → Environment variables

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/audit:nestjs
─────────────
  LOAD:
    → AGENT-BOOT.md
    → MASTER.md
    → web/WEB-PHILOSOPHY.md
    → web/WEB-CHECKLIST.md
    → web/frameworks/NESTJS.md
    → web/vulnerabilities/AUTH-AUTHZ.md
    → web/vulnerabilities/INJECTION.md
    → shared/SEVERITY-SCORING.md
    → reports/REPORT-TEMPLATE-WEB.md

  BEHAVIOR:
    1. Apply the NestJS threat model
    2. Analyze Guards, Interceptors, Pipes
    3. Check DTOs and their validation
    4. Analyze GraphQL if present
    5. Check ORM configurations (TypeORM, Prisma)

  OUTPUT:
    → Complete NestJS audit report
    → Fix code in NestJS/TypeScript syntax

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/audit:react-native
───────────────────
  LOAD:
    → AGENT-BOOT.md
    → MASTER.md
    → mobile/MOBILE-PHILOSOPHY.md
    → mobile/MOBILE-CHECKLIST.md
    → mobile/frameworks/REACT-NATIVE.md
    → mobile/vulnerabilities/STORAGE.md
    → mobile/vulnerabilities/NETWORK-MOBILE.md
    → mobile/vulnerabilities/IPC-DEEPLINKS.md
    → shared/SEVERITY-SCORING.md
    → reports/REPORT-TEMPLATE-MOBILE.md

  BEHAVIOR:
    1. Apply the React Native threat model
    2. Scan AsyncStorage for sensitive data
    3. Check certificate pinning
    4. Analyze WebViews and bridges
    5. Check deep links and Linking API
    6. Scan logs in production

  OUTPUT:
    → Complete React Native audit report
    → Fix code in RN/TypeScript syntax

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/audit:flutter
──────────────
  LOAD:
    → AGENT-BOOT.md
    → MASTER.md
    → mobile/MOBILE-PHILOSOPHY.md
    → mobile/MOBILE-CHECKLIST.md
    → mobile/frameworks/FLUTTER.md
    → mobile/vulnerabilities/STORAGE.md
    → mobile/vulnerabilities/NETWORK-MOBILE.md
    → shared/SEVERITY-SCORING.md
    → reports/REPORT-TEMPLATE-MOBILE.md

  BEHAVIOR:
    1. Apply the Flutter threat model
    2. Check flutter_secure_storage vs SharedPreferences
    3. Analyze Dio / http with pinning
    4. Check platform channels
    5. Analyze pubspec.yaml for dependencies

  OUTPUT:
    → Complete Flutter audit report
    → Fix code in Dart/Flutter syntax

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/audit:report
─────────────
  ALIAS: /audit:generate-report

  LOAD:
    → reports/REPORT-TEMPLATE-WEB.md or REPORT-TEMPLATE-MOBILE.md
    → reports/EXECUTIVE-SUMMARY-TEMPLATE.md
    → shared/SEVERITY-SCORING.md
    → shared/OWASP-MAPPER.md
    → shared/COMPLIANCE.md

  BEHAVIOR:
    1. Take all findings from the current session
    2. Structure them according to the appropriate template
    3. Calculate the overall score
    4. Generate the prioritized remediation plan
    5. Calculate OWASP / MASVS compliance
    6. Produce the complete formatted report

  OUTPUT:
    → Complete audit report in Markdown
    → Ready to copy into Notion, Confluence, GitHub

  NOTE:
    This command is typically called AFTER an audit.
    It formats and structures already identified findings.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/audit:exec
───────────
  ALIAS: /audit:executive, /audit:summary

  LOAD:
    → reports/EXECUTIVE-SUMMARY-TEMPLATE.md

  BEHAVIOR:
    1. Take session findings
    2. Translate EVERYTHING into business language (zero jargon)
    3. Calculate estimated financial impact
    4. Produce a 1-2 page executive summary
    5. Formulate the Go/No-Go recommendation

  OUTPUT:
    → Executive Summary in Markdown
    → Intended for non-technical decision-makers
    → 1-2 pages maximum

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/audit:rgpd
───────────
  ALIAS: /audit:gdpr, /audit:privacy

  LOAD:
    → AGENT-BOOT.md
    → MASTER.md
    → shared/COMPLIANCE.md
    → shared/SEVERITY-SCORING.md

  BEHAVIOR:
    1. Identify all personal data processed
    2. Check Art. 25 requirements (Privacy by Design)
    3. Check Art. 32 requirements (Security)
    4. Check implemented user rights
    5. Evaluate overall compliance

  OUTPUT:
    → RGPD compliance score
    → Findings per RGPD article
    → Estimated fine risk

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/audit:masvs
────────────
  LOAD:
    → AGENT-BOOT.md
    → MASTER.md
    → mobile/MOBILE-PHILOSOPHY.md
    → mobile/MOBILE-CHECKLIST.md
    → shared/OWASP-MAPPER.md
    → shared/SEVERITY-SCORING.md
    → shared/COMPLIANCE.md

  BEHAVIOR:
    1. Evaluate each applicable MASVS 2.0 control
    2. Cover all 7 MASVS categories
    3. Calculate score per category
    4. Determine achieved level (L1 / L2 / R)
    5. Identify gaps to reach the next level

  OUTPUT:
    → Complete MASVS scorecard
    → Achieved compliance level
    → Roadmap to the next level

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/audit:owasp
────────────
  LOAD:
    → AGENT-BOOT.md
    → MASTER.md
    → web/WEB-PHILOSOPHY.md
    → shared/OWASP-MAPPER.md
    → shared/SEVERITY-SCORING.md

  BEHAVIOR:
    1. Evaluate each OWASP Top 10 2023 item
    2. Status PASS / FAIL / PARTIAL for each item
    3. Justification for each status
    4. Overall OWASP score

  OUTPUT:
    → Complete OWASP Top 10 scorecard
    → Justification per item
    → Overall OWASP compliance score

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/audit:help
───────────
  BEHAVIOR:
    Display the full list of available commands
    with a short description of each.
    Do not load any audit files.
    Respond immediately without analysis.

  OUTPUT:
    → Complete index of all commands
    → One-line description per command
    → Usage examples

═══════════════════════════════════════════════════════════════
              AGENT ROUTING RULES
═══════════════════════════════════════════════════════════════

RULE 1 — UNKNOWN COMMAND
  If you receive a /audit:xxx command not defined here:
  → Display: "Unknown command. Type /audit:help
    to see all available commands."
  → Do not improvise behavior

RULE 2 — COMMAND WITHOUT FILE
  If a command is run without a file or code provided:
  → Ask: "Which file or directory should I
    audit?"
  → Wait for the answer before loading files

RULE 3 — AUTO FRAMEWORK DETECTION
  For /audit and /audit:web and /audit:mobile:
  → Analyze submitted code to detect the framework
  → Automatically load the correct framework file
  → If ambiguous: ask for confirmation before proceeding

RULE 4 — COMMAND COMBINATION
  The user can combine:
  "/audit:auth /audit:injection src/controllers/"
  → Load files from both commands
  → Deduplicate common files
  → Execute both behaviors sequentially

RULE 5 — GLOBAL OPTIONS
  These options can be added to any command:
  --level=quick     → Only CRITICAL and HIGH
  --level=deep      → All severity levels
  --report          → Generate the report at the end
  --exec            → Generate the executive summary too
  --framework=xxx   → Force a specific framework
  --compliance=rgpd → Add compliance verification
