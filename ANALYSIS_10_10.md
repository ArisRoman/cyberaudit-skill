# 🛡️ Analyse Technique du Projet CyberAudit
## Plan de transformation vers un SAST Shift-Left "10/10 Partout"

Ce document dresse une analyse approfondie du projet **CyberAudit Skill** au regard du plan de transformation visant à passer d'une note globale estimée de 7/10 à un niveau d'excellence absolue de 10/10 partout. 

Actuellement, le projet est un **skill d'agent IA hybride très performant**, combinant des checklists Markdown ultra-complètes pour guider les LLM et un moteur de scan déterministe basé sur des expressions régulières (27 patterns au total, dont 15 secrets et 12 failles web) pour garantir zéro hallucination sur les vulnérabilités évidentes.

Pour en faire un **vrai produit SAST shift-left de niveau entreprise**, nous devons dépasser les limites des expressions régulières et de la passivité des checklists en concevant des moteurs de scan basés sur l'AST (Arbre Syntaxique Abstrait), le Taint Tracking, des intégrations de moteurs de référence, et un système d'installation transactionnel, robuste et sans pollution de dépôt.

---

## Sommaire
- [1. Installation & Support Multi-Agents : 7.5 → 10/10](#1-installation--support-multi-agents--75--1010)
- [2. Scanner de Secrets : 7 → 10/10](#2-scanner-de-secrets--7--1010)
- [3. Scanner Web / SAST : 6 → 10/10](#3-scanner-web--sast--6--1010)
- [4. Checklists Markdown Interactives : 8/3 → 10/10](#4-checklists-markdown-interactives--83--1010)
- [5. Générateur de Rapports (Report Generator) : 8/5 → 10/10](#5-générateur-de-rapports-report-generator--85--1010)
- [6. Documentation & DX (Expérience Développeur) : 7 → 10/10](#6-documentation--dx-expérience-développeur--7--1010)
- [7. Sécurité de l'Installateur : 8 → 10/10](#7-sécurité-de-linstallateur--8--1010)
- [8. Propositions d'Architectures & Exemples de Code Concrets](#8-propositions-darchitectures--exemples-de-code-concrets)

---

## 1. Installation & Support Multi-Agents : 7.5 → 10/10

### État actuel
*   L'installation s'effectue via `src/cli.ts` (ou la commande `npx cyberaudit-skill install`).
*   Le script gère une configuration complexe pour **22 agents** (`opencode`, `claude-code`, `cursor`, `windsurf`, etc.) en copiant l'intégralité du répertoire des compétences Markdown (`skills/cyberaudit/`, ~11 Mo) directement dans le dossier local ou global de chaque agent.
*   En cas d'installation multi-agents ou globale + locale, le code subit une duplication de fichiers lourde (plus de 11 Mo par agent), ce qui encombre le disque et pollue le projet si l'installation se fait en mode `--local`.
*   Les vérifications de sécurité des chemins (`isSafeCommandPath`, `isSafeSkillPath`) reposent sur des validations d'inclusion textuelle basiques (`p.includes("commands")`, `p.includes("skills")`), potentiellement vulnérables à des attaques par traversée de répertoires ou des faux blocages.
*   Il manque des commandes robustes de désinstallation complète, de mise à jour incrémentale, et d'autodiagnostic (`doctor`).
*   La configuration MCP est limitée à Cursor (`.cursor/mcp.json`).

### Gaps & Solutions Techniques (10/10)

1.  **Dossier Partagé (`~/.shared`) et Wrappers Minimaux :**
    *   *Concept :* Installer l'intégralité du contenu lourd (~11 Mo de checklists et guides) dans un dossier unique centralisé, par exemple `~/.shared/cyberaudit/` (mode global) ou `./.shared/cyberaudit/` (mode local).
    *   *Wrapper :* Pour chaque agent, ne copier qu'un fichier Markdown de 5 à 10 lignes (un wrapper ou redirection) qui indique à l'agent d'aller lire le contexte et les checklists directement dans le dossier centralisé partagé. Cela réduit la duplication de 11 Mo à quelques octets par agent.
2.  **Sécurité Stricte par Whitelisting de Chemins :**
    *   *Concept :* Bannir les vérifications d'inclusion floues.
    *   *Implémentation :* Résoudre le chemin de manière absolue via `path.resolve()`, calculer sa position relative par rapport au dossier racine cible avec `path.relative()`, et rejeter immédiatement tout chemin contenant des `..` remontant hors de la zone autorisée. Utiliser un ensemble strict d'autorisations (`allowedSet`) mappé sur `AGENT_CONFIG`.
3.  **Détection Robuste du Contexte Système :**
    *   *Concept :* Ne pas se contenter de vérifier l'existence de dossiers parents dans le répertoire utilisateur.
    *   *Implémentation :* Exécuter des commandes asynchrones via `exec` pour vérifier la présence réelle et la version des exécutables installés (`claude --version`, `cursor --version`, `windsurf --version`). Journaliser ces informations pour faciliter le diagnostic.
4.  **Auto `.gitignore` Intelligent :**
    *   *Concept :* En mode `--local`, la création de fichiers dans le projet ne doit pas polluer les pull requests des développeurs.
    *   *Implémentation :* Sauf si l'option `--commit` est explicitement passée, détecter le fichier `.gitignore` à la racine et y injecter automatiquement la ligne `/.shared/cyberaudit/` et les sous-dossiers locaux générés (ex. `/.claude/skills/cyberaudit/`), avec des commentaires d'encadrement propres (`# CyberAudit Skill - Start` / `# CyberAudit Skill - End`).
5.  **Commandes `uninstall`, `update`, `doctor` Complètes :**
    *   *Uninstall :* Nettoie méticuleusement tous les wrappers copiés et le dossier central partagé sans risque.
    *   *Update :* Compare le fichier `VERSION` ou le `package.json` distant/local et effectue un remplacement atomique.
    *   *Doctor :* Vérifie la validité des fichiers installés, valide le frontmatter Markdown, s'assure que les variables d'environnement nécessaires sont chargées et que les 8 commandes principales répondent correctement.
6.  **MCP Universel :**
    *   *Concept :* Configurer automatiquement l'intégration MCP pour tous les IDE et outils compatibles.
    *   *Implémentation :* Modifier et enrichir les fichiers JSON de configuration de Claude Desktop, Windsurf (`~/.windsurf/mcp.json`), Continue (`~/.continue/config.json`) et Cline (`~/.cline/mcp.json`).

---

## 2. Scanner de Secrets : 7 → 10/10

### État actuel
*   Implémentation dans `src/scanners/secrets.ts`.
*   Analyse par expressions régulières (15 expressions régulières statiques pour AWS, Stripe, GitHub, clés privées, etc.) exécutée ligne par ligne.
*   Gère des exclusions simples de mots-clés (`'example'`, `'testkey'`).
*   Se limite à l'arborescence des fichiers du répertoire de travail actuel, ignorant l'historique de versioning de Git.
*   Aucune vérification logique ou cryptographique de la clé (pas de validation de checksum Base32 ou de dry-run API).

### Gaps & Solutions Techniques (10/10)

```
[Code Source] ──► [Regex / Filtres Initiaux] ──► [Validation Checksum (Base32/Luhn)] ──► [Dry-run API (Opt-in)] ──► 0% Faux Positifs
```

1.  **Intégration d'un Moteur Standard (Gitleaks / Trufflehog) :**
    *   *Concept :* Développer un wrapper en TypeScript pour appeler directement les binaires natifs de Gitleaks ou Trufflehog si disponibles sur le système, ou en intégrant leurs configurations TOML extrêmement complètes (plus de 100 règles de détection de secrets affinées, gestion d'entropie).
2.  **Validation Active & Cryptographique des Clés :**
    *   *AWS Access Key (AKIA) :* Vérifier la structure de la clé de 20 caractères (préfixe `AKIA` + encodage Base32 valide). Un calcul simple de checksum permet d'exclure les chaînes aléatoires n'ayant pas la signature cryptographique d'AWS.
    *   *Stripe Secret Key :* Valider le format (`sk_live_` suivi de 24 à 32 caractères hexadécimaux ou base62). Optionnellement, proposer un appel sec en dry-run (opt-in sécurisé) vers `https://api.stripe.com/v1/tokens` pour valider l'authenticité de la clé si l'utilisateur l'autorise.
    *   *GitHub PAT :* Valider la signature (`ghp_` ou `github_pat_`). Permettre un appel dry-run vers `https://api.github.com/user` avec le token pour vérifier la validité et les scopes associés.
3.  **Scan de l'Historique Git :**
    *   *Concept :* Les développeurs ont tendance à supprimer les secrets de leur code de production mais oublient qu'ils restent présents dans les commits précédents de l'historique Git.
    *   *Implémentation :* Utiliser des commandes Git (`git log -p` ou `git diff`) pour scanner l'historique complet des commits du dépôt et remonter les secrets "supprimés mais toujours exposés".
4.  **Baseline et Ignore List :**
    *   *Concept :* Permettre de marquer des faux positifs avérés de manière définitive.
    *   *Implémentation :* Gérer un fichier de configuration `.cyberauditignore` ou `.secrets.baseline` compatible avec le format Gitleaks pour stocker les signatures de fichiers et de lignes acceptés et ne plus lever d'alerte lors des scans suivants.

---

## 3. Scanner Web / SAST : 6 → 10/10

### État actuel
*   Implémentation dans `src/scanners/web.ts`.
*   Analyse purement regex (12 patterns de base pour SQLi, XSS, eval, injection de commandes, CORS wildcard).
*   Sensible aux faux positifs (par exemple, un `eval("const a = 1")` inoffensif sera flaggé comme vulnérable) et aux faux négatifs (une faille XSS sur 3 lignes ne sera pas détectée car l'expression régulière s'exécute de manière mono-ligne).
*   Absence de **Taint Tracking** (suivi de propagation de données utilisateur depuis une source `req.query` vers un puits sensible `db.query`).

### Gaps & Solutions Techniques (10/10)

```
[Source d'entrée: req.query.id] ──► (Propagation dans les variables) ──► [Puits sensible: db.query()] ──► Alerte SAST avec Flux
```

1.  **Moteur AST (Babel / Semgrep) :**
    *   *Option Semgrep (Recommandée) :* Intégrer Semgrep via son CLI (`semgrep --config auto`) en ciblant les règles de sécurité OWASP de la communauté pour le JavaScript, TypeScript, Python et PHP. Semgrep analyse l'arbre syntaxique et réalise un Taint Tracking inter-fichiers extrêmement précis.
    *   *Option Parser Babel Léger (Zéro dépendance native) :* Si l'on souhaite conserver un outil ultra-léger sans dépendance système complexe, utiliser `@babel/parser` et `@babel/traverse` pour analyser le code JavaScript/TypeScript. Cela permet de suivre le cycle de vie d'une variable (par exemple, détecter qu'un paramètre issu de `req.query` est affecté à une variable intermédiaire, puis injecté sans filtre dans une requête SQL brute).
2.  **Règles de Contextualisation AST :**
    *   *Helmet & CORS :* Au lieu de chercher simplement le mot `"helmet"` n'importe où dans le fichier, analyser l'AST pour vérifier si l'application Express (`express()`) appelle effectivement `app.use(helmet())` et si la configuration de CORS restreint bien les origines autorisées de manière dynamique.
    *   *XSS / dangerouslySetInnerHTML :* Parcourir l'AST pour remonter de 5 à 10 lignes ou analyser l'arbre pour détecter si la variable assignée au composant React a fait l'objet d'un appel à `DOMPurify.sanitize()` ou à une méthode équivalente de désinfection.
3.  **Support de Patterns Étendus :**
    *   Ajouter plus de 100 règles précises ciblant les failles complexes : **Open Redirect** (redirection basée sur l'entrée utilisateur), **Path Traversal** (concaténation dans `fs.readFile`), **XXE** (lecture XML non sécurisée), **SSRF** (requêtes HTTP sortantes dynamiques non validées).

---

## 4. Checklists Markdown Interactives : 8/3 → 10/10

### État actuel
*   Les checklists (comme `web/WEB-CHECKLIST.md` ou `mobile/MOBILE-CHECKLIST.md`) sont de riches documents Markdown passifs contenant des listes à cocher (`□ No API key in source`).
*   Elles comptent pour un 8/10 en complétude grâce à la qualité encyclopédique de leur contenu, mais seulement 3/10 en actionnabilité, car l'agent IA doit charger ces fichiers et faire la vérification mentalement, sans interactivité ni lien direct avec le scanner de code.

### Gaps & Solutions Techniques (10/10)

1.  **Liaison Bidirectionnelle (Scanner ◄──► Checklist) :**
    *   *Concept :* Connecter les résultats du scanner automatique aux éléments de la checklist.
    *   *Implémentation :* Si le scanner déterministe détecte une faille `WEB_SQLI_CONCAT`, la checklist de la section "Injection" correspondante doit automatiquement passer en état **❌ FAIL** dans le contexte de l'agent, avec un lien d'ancrage hypertexte pointant vers la ligne de code en question et les instructions de correction.
2.  **Transformation en Questions Interactives pour l'Agent IA :**
    *   *Concept :* Redéfinir les items de la checklist pour qu'ils s'expriment sous la forme de questions de diagnostic actives guidant l'agent.
    *   *Exemple :* Remplacer `□ No API key in source` par :
        > "Vérifie la présence d'un fichier `.env` ou de clés de configuration commis. Si un fichier `.env` est détecté dans le dépôt, demande immédiatement à l'utilisateur s'il s'agit d'une action volontaire et propose le correctif de suppression et d'ajout au `.gitignore`."
3.  **Enrichissement Didactique Système :**
    *   Ajouter pour chaque point sensible de la checklist : un court exemple de code vulnérable, son équivalent corrigé sécurisé, et un squelette de test unitaire (ex. avec Jest/Vitest) que l'agent peut copier-coller dans le projet de l'utilisateur pour valider la non-régression de la faille.
4.  **Script d'Auto-Mise à Jour (OWASP Top 10 Continuel) :**
    *   Développer un script Node.js qui interroge régulièrement les APIs publiques d'OWASP pour détecter les nouveautés de l'OWASP Top 10 (ex. mise à jour vers les versions futures de 2025/2026) et générer des diffs automatiques des checklists.

---

## 5. Générateur de Rapports (Report Generator) : 8/5 → 10/10

### État actuel
*   Implémentation dans `src/report/generator.ts`.
*   Génère un rapport Markdown contenant un résumé analytique, une note globale (Security Score sur 100) pondérée par la sévérité des failles trouvées, un tableau de conformité OWASP rudimentaire et un plan de remédiation découpé en phases temporelles.
*   Score de structure : 8/10 (très lisible et bien découpé).
*   Score de précision : 5/10 (ne propose pas de calcul de risques financiers réels, manque de preuves de concept automatisées et d'exports multi-formats standardisés).

### Gaps & Solutions Techniques (10/10)

1.  **Quantification du Risque via le Modèle FAIR :**
    *   *Concept :* Traduire les termes techniques de cybersécurité en termes financiers compréhensibles par les décideurs (C-Level / CISO).
    *   *Implémentation :* Calculer le risque via la méthode FAIR (*Factor Analysis of Information Risk*), en multipliant la probabilité d'exploitation (déterminée par le CVSS et l'exposition réseau) par l'impact financier estimé (ex. fuite de clés AWS = coût moyen de 50 000 $ à 500 000 $ en ressources volées ou pénalités).
2.  **Preuve de Concept (PoC) Automatisée :**
    *   *Concept :* Démontrer l'exploitabilité de la faille de manière sûre pour éliminer tout doute sur un potentiel faux positif.
    *   *Implémentation :* Pour chaque vulnérabilité critique détectée, générer automatiquement une commande d'exploitation inoffensive (ex. une requête `curl` spécifique exploitant une faille BOLA : `curl -H "Authorization: Bearer <user1_token>" /api/users/2`) que l'utilisateur peut tester localement pour confirmer la vulnérabilité.
3.  **Mapping de Conformité Granulaire :**
    *   *Concept :* Lier chaque faille à l'article précis d'une réglementation de sécurité plutôt qu'à une mention générale.
    *   *Implémentation :* Mapper précisément les findings vers les articles exacts du **RGPD** (ex. Article 32 sur la sécurité du traitement), de la norme **PCI-DSS** (ex. Règle 6.5 sur le codage sécurisé), ou de la loi **HIPAA** (ex. § 164.312).
4.  **Rapport Différentiel (Diff with Baseline) :**
    *   *Concept :* Dans un pipeline CI/CD, ne pas surcharger l'équipe avec des failles déjà acceptées, mais mettre en évidence uniquement les nouvelles régressions.
    *   *Implémentation :* Permettre de passer un fichier JSON de référence (`--baseline findings.json`). Le générateur compare le scan actuel et met en avant : "2 nouvelles failles introduites, 1 faille résolue".
5.  **Multi-Formats d'Exportations :**
    *   Prendre en charge la génération de rapports de conformité aux formats **SARIF** (pour intégration directe dans GitHub Advanced Security), **JUnit** (pour afficher les vulnérabilités comme des tests échoués dans Jenkins/GitLab), et un format **PDF** propre (via un pont avec `md-to-pdf`).

---

## 6. Documentation & DX (Expérience Développeur) : 7 → 10/10

### Gaps & Solutions Techniques (10/10)
1.  **Documentation Site Docusaurus :**
    *   Publier un site de documentation web complet décrivant chaque règle, chaque commande de l'agent, et proposant des tutoriels d'intégration pas-à-pas pour les 22 agents supportés.
2.  **Support Multilingue (FR/EN) :**
    *   Le créateur de l'outil et l'utilisateur parlent français, mais le skill est 100% en anglais. L'introduction d'une internationalisation (i18n) complète pour les checklists et les messages d'aide CLI garantira une adoption maximale dans les équipes francophones et anglophones.
3.  **Playground Interactif :**
    *   Déployer une application web simple (ex. sur Vercel) permettant aux développeurs de coller un extrait de code source et de voir en temps réel, de manière interactive, les vulnérabilités détectées par le moteur de scan SAST de CyberAudit.

---

## 7. Sécurité de l'Installateur : 8 → 10/10

### État actuel
*   L'installateur utilise la commande `rmSync(dst, { recursive: true, force: true })` pour supprimer les anciennes installations avant d'écrire la nouvelle.
*   En cas d'interruption du processus système, d'erreur de permissions, ou de verrouillage de fichiers (très fréquent sur Windows), l'installation est corrompue ou échoue, laissant l'agent sans skill fonctionnel.

### Gaps & Solutions Techniques (10/10)

```
[Installation] ◄── [Backup Ancien Dossier] ──► [Copie Nouvelle Version] ──► [Vérification Hash SHA-256] ──► [Suppression Backup]
                                                                                      │
                                                                           (En cas d'échec: Rollback)
```

1.  **Transactions d'Installation avec Rollback :**
    *   *Concept :* Ne jamais casser l'état existant tant que le nouvel état n'est pas pleinement fonctionnel et validé.
    *   *Implémentation :* Renommer le dossier existant de l'agent vers un dossier temporaire de sauvegarde (`cyberaudit.backup`). Copier la nouvelle version. En cas de succès de la copie et de la validation, supprimer la sauvegarde. En cas d'erreur ou d'interruption, restaurer immédiatement le dossier de sauvegarde original (Rollback).
2.  **Signature et Provenance Sigstore :**
    *   Garantir l'intégrité de la distribution NPM en signant le package avec la provenance cryptographique **Sigstore** lors de l'étape de publication sur le registre npmjs.
3.  **Validation d'Intégrité par Checksum SHA-256 :**
    *   À la fin de la phase de copie, calculer le hash SHA-256 des fichiers du skill copiés et le comparer avec un manifeste de référence pour s'assurer qu'aucun fichier n'a été tronqué ou modifié de manière malveillante.

---

## 8. Propositions d'Architectures & Exemples de Code Concrets

Pour matérialiser ce plan de transformation de manière pragmatique, voici les squelettes de code TypeScript à intégrer dans les futures itérations du projet.

### A. Implémentation du Wrapper d'Agent IA (Évite les 11 Mo dupliqués)

Au lieu de dupliquer les répertoires, nous installons le skill de manière centralisée dans `~/.shared/cyberaudit/` et écrivons un wrapper de quelques lignes pour chaque agent. 

Voici un exemple de génération de wrapper pour l'agent Claude Code (`~/.claude/skills/cyberaudit/SKILL.md`) :

```typescript
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { homedir } from "os";

export function installMinimalWrapper(agentSkillPath: string, globalSharedPath: string) {
  mkdirSync(agentSkillPath, { recursive: true });
  
  const wrapperContent = `---
name: cyberaudit
description: Security audit intelligence. Redirects to central shared skill.
---

# CyberAudit AI Wrapper

This agent skill is a lightweight pointer to the central CyberAudit installation.
To execute any security checklist or audit command, you must read the actual configurations, rules, and taxonomies from the shared path below:

SHARED_PATH: ${globalSharedPath}

## Instructions for the Agent:
1. Always resolve paths relative to SHARED_PATH.
2. When loading commands, read: SHARED_PATH/commands/
3. When verifying security controls, read: SHARED_PATH/web/WEB-CHECKLIST.md or SHARED_PATH/mobile/MOBILE-CHECKLIST.md
4. Always adopt the expert auditor persona defined in SHARED_PATH/AGENT-BOOT.md.
`;

  writeFileSync(join(agentSkillPath, "SKILL.md"), wrapperContent, "utf-8");
}
```

### B. Analyseur de Flux AST Léger avec Babel pour le Taint Tracking

Pour détecter de vraies failles d'injection SQL (`WEB_SQLI_CONCAT`) sans Semgrep, en utilisant uniquement l'AST de Babel, nous pouvons suivre les flux d'entrées utilisateur de manière intra-fichier :

```typescript
import * as parser from "@babel/parser";
import traverse from "@babel/traverse";

export function analyzeTaintTracking(sourceCode: string): string[] {
  const ast = parser.parse(sourceCode, {
    sourceType: "module",
    plugins: ["typescript", "jsx"],
  });

  const sources = new Set<string>(); // Variables contenant des inputs utilisateur (ex: req.query.id)
  const vulnerabilities: string[] = [];

  // Étape 1 : Identifier les variables "contaminées" (Tainted)
  traverse.default(ast, {
    VariableDeclarator(path) {
      const init = path.node.init;
      // Détecte const id = req.query.id ou const input = req.body
      if (
        init &&
        init.type === "MemberExpression" &&
        init.object.type === "Identifier" &&
        init.object.name === "req"
      ) {
        if (path.node.id.type === "Identifier") {
          sources.add(path.node.id.name);
        }
      }
    },
  });

  // Étape 2 : Suivre la propagation vers un puits sensible (ex: db.query)
  traverse.default(ast, {
    CallExpression(path) {
      const callee = path.node.callee;
      // Vérifie si on appelle db.query, connection.execute, pool.query
      if (
        callee.type === "MemberExpression" &&
        callee.property.type === "Identifier" &&
        ["query", "execute"].includes(callee.property.name)
      ) {
        // Vérifie si le premier argument est une concaténation ou un template literal contenant une variable contaminée
        const firstArg = path.node.arguments[0];
        if (firstArg) {
          let containsTaint = false;
          
          if (firstArg.type === "BinaryExpression" && firstArg.operator === "+") {
            // Analyse simple de concaténation : SELECT * FROM users WHERE id = + id
            traverse.default(firstArg, {
              Identifier(subPath) {
                if (sources.has(subPath.node.name)) {
                  containsTaint = true;
                }
              }
            }, path.scope);
          } else if (firstArg.type === "TemplateLiteral") {
            // Analyse de template literal: SELECT * FROM users WHERE id = ${id}
            for (const expr of firstArg.expressions) {
              if (expr.type === "Identifier" && sources.has(expr.name)) {
                containsTaint = true;
              }
            }
          }

          if (containsTaint) {
            vulnerabilities.push(
              `SQL Injection détectée à la ligne ${path.node.loc?.start.line} : variable utilisateur non sécurisée injectée dans db.query`
            );
          }
        }
      }
    },
  });

  return vulnerabilities;
}
```

### C. Validation Active des Clés d'API (Dry-Run de Secrets)

Voici comment valider l'authenticité d'un token GitHub PAT ou d'une clé de signature Stripe de manière asynchrone lors du scan :

```typescript
import https from "https";

export function validateGitHubToken(token: string): Promise<boolean> {
  return new Promise((resolve) => {
    const options = {
      hostname: "api.github.com",
      path: "/user",
      method: "GET",
      headers: {
        "User-Agent": "CyberAudit-Scanner",
        "Authorization": `token ${token}`,
      },
    };

    const req = https.request(options, (res) => {
      // 200 OK indique que le token est actif et valide
      resolve(res.statusCode === 200);
    });

    req.on("error", () => resolve(false));
    req.end();
  });
}
```

### D. Algorithme de Calcul Financier FAIR (Risk Quantification)

Pour intégrer un modèle financier d'aide à la décision CISO dans le rapport :

```typescript
export interface FAIRRiskResult {
  lossEventFrequency: number; // Probabilité annuelle d'exploitation (0.01 à 1.0)
  probableLossMagnitude: number; // Coût moyen estimé par incident ($)
  annualizedLossExpectancy: number; // Risque financier annualisé ($)
}

export function calculateFAIRRisk(severity: string, isExposed: boolean): FAIRRiskResult {
  let lossEventFrequency = 0.05; // 5% de chance par an par défaut
  let probableLossMagnitude = 10000; // 10 000 $ par défaut

  switch (severity) {
    case "CRITICAL":
      lossEventFrequency = isExposed ? 0.85 : 0.40;
      probableLossMagnitude = 150000; // Vol de données, rançonnage, ressources cloud
      break;
    case "HIGH":
      lossEventFrequency = isExposed ? 0.60 : 0.25;
      probableLossMagnitude = 50000;
      break;
    case "MEDIUM":
      lossEventFrequency = isExposed ? 0.30 : 0.10;
      probableLossMagnitude = 15000;
      break;
    case "LOW":
      lossEventFrequency = 0.05;
      probableLossMagnitude = 2000;
      break;
  }

  return {
    lossEventFrequency,
    probableLossMagnitude,
    annualizedLossExpectancy: Math.round(lossEventFrequency * probableLossMagnitude),
  };
}
```

### E. Processus de Remplacement d'Installation Transactionnel (Robuste & Sûr)

Pour remplacer les appels dangereux à `rmSync` par une transaction robuste et réversible :

```typescript
import { renameSync, mkdirSync, cpSync, rmSync, existsSync } from "fs";

export function safeInstallTransaction(srcDir: string, destDir: string) {
  const backupDir = `${destDir}.backup_${Date.now()}`;
  let backupCreated = false;

  try {
    // Étape 1 : Créer un backup de l'ancienne version si elle existe
    if (existsSync(destDir)) {
      renameSync(destDir, backupDir);
      backupCreated = true;
    }

    // Étape 2 : Tenter la copie de la nouvelle version
    mkdirSync(destDir, { recursive: true });
    cpSync(srcDir, destDir, { recursive: true });

    // Étape 3 : Nettoyer la sauvegarde en cas de succès complet
    if (backupCreated) {
      rmSync(backupDir, { recursive: true, force: true });
    }
    console.log("✓ Installation effectuée avec succès de manière sécurisée.");
  } catch (error: any) {
    console.error(`✗ Échec de l'installation : ${error.message}. Lancement du rollback...`);
    
    // Étape 4 : Rollback en cas d'erreur de copie
    try {
      if (existsSync(destDir)) {
        rmSync(destDir, { recursive: true, force: true });
      }
      if (backupCreated && existsSync(backupDir)) {
        renameSync(backupDir, destDir);
        console.log("✓ Rollback effectué. L'ancienne version stable a été restaurée.");
      }
    } catch (rollbackError: any) {
      console.error(`✗ Échec critique du rollback : ${rollbackError.message}`);
    }
    throw error;
  }
}
```

---

## Conclusion

Le **Plan 10/10 partout** est à la fois lucide, réaliste et extrêmement formateur pour l'avenir de CyberAudit. 

Aujourd'hui, l'outil excelle sur la partie **contexte et checklists pour agents intelligents** (ce qui est sa force principale de skill IA), mais pour obtenir un score parfait de 10/10 en tant que solution logicielle SAST et outil de sécurité Shift-Left de niveau professionnel, l'effort doit se concentrer sur la **Phase 2 (Moteurs Gitleaks + Semgrep / AST)** et la **Phase 7 (Fiabilisation de l'installateur)**.

Ces améliorations permettront de supprimer définitivement les faux positifs liés aux expressions régulières, de garantir la sécurité des opérations sur la machine du développeur, et de livrer des rapports d'audit d'une valeur inestimable, prêts à être signés par un CISO et intégrés directement en intégration continue (CI/CD).
