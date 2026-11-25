# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: a11y.admin.spec.ts >> a11y admin — connecté >> plans light
- Location: e2e\tests\a11y.admin.spec.ts:30:7

# Error details

```
Error: Violations axe critical/serious sur admin /plans light

expect(received).toBe(expected) // Object.is equality

Expected: ""
Received: "[serious] color-contrast (1) Elements must meet minimum color contrast ratio thresholds
    - td:nth-child(5) > .flex-wrap.gap-1.inline-flex > .border-success\\/20.bg-success\\/10.text-success ::   Element has insufficient color contrast of 4.38 (foreground color: #15803d, background color: #e8f2ec, font size: 9.0pt (12px), font weight: normal). Expected contrast ratio of 4.5:1"
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - link "Aller au contenu" [ref=e3] [cursor=pointer]:
      - /url: "#contenu"
    - complementary [ref=e4]:
      - generic [ref=e5]: SaaS LMS · Admin
      - navigation "Navigation principale" [ref=e11]:
        - generic [ref=e12]:
          - link "Tableau de bord" [ref=e13] [cursor=pointer]:
            - /url: /
          - link "Sécurité du compte" [ref=e20] [cursor=pointer]:
            - /url: /security
        - generic [ref=e25]:
          - paragraph [ref=e26]: Plateforme
          - link "Entreprises" [ref=e27] [cursor=pointer]:
            - /url: /tenants
          - link "Plans & tarification" [ref=e33] [cursor=pointer]:
            - /url: /plans
          - link "Comptes administrateurs" [ref=e38] [cursor=pointer]:
            - /url: /admin-users
          - link "Langues" [ref=e43] [cursor=pointer]:
            - /url: /languages
          - link "Intégrations" [ref=e49] [cursor=pointer]:
            - /url: /integrations
          - link "Modèles de certificats" [ref=e53] [cursor=pointer]:
            - /url: /certificate-library
          - link "Pages légales" [ref=e58] [cursor=pointer]:
            - /url: /legal
          - link "Modèles d'e-mails" [ref=e64] [cursor=pointer]:
            - /url: /notification-templates
        - generic [ref=e69]:
          - paragraph [ref=e70]: Finances
          - link "Paiements" [ref=e71] [cursor=pointer]:
            - /url: /payments
          - link "Remboursements" [ref=e75] [cursor=pointer]:
            - /url: /refunds
          - link "Finances & reversements" [ref=e80] [cursor=pointer]:
            - /url: /wallets
          - link "Paramètres financiers" [ref=e85] [cursor=pointer]:
            - /url: /finance-settings
          - link "Rapprochement" [ref=e88] [cursor=pointer]:
            - /url: /reconciliation
        - generic [ref=e95]:
          - paragraph [ref=e96]: Supervision
          - link "Formations" [ref=e97] [cursor=pointer]:
            - /url: /courses
          - link "Apprenants" [ref=e101] [cursor=pointer]:
            - /url: /learners
          - link "Certificats" [ref=e106] [cursor=pointer]:
            - /url: /certificates
          - link "Transactions" [ref=e111] [cursor=pointer]:
            - /url: /transactions
        - generic [ref=e116]:
          - paragraph [ref=e117]: Suivi
          - link "Analytique" [ref=e118] [cursor=pointer]:
            - /url: /analytics
          - link "Consommation IA" [ref=e123] [cursor=pointer]:
            - /url: /ai-consumption
          - link "Santé technique" [ref=e128] [cursor=pointer]:
            - /url: /health
          - link "Journal d'audit" [ref=e132] [cursor=pointer]:
            - /url: /audit-log
    - generic [ref=e139]:
      - banner [ref=e140]:
        - button "Replier le menu latéral" [expanded] [ref=e141] [cursor=pointer]
        - generic [ref=e145]:
          - generic "Super Administrateur" [ref=e146]
          - 'link "Alertes : aucune alerte critique" [ref=e147] [cursor=pointer]':
            - /url: /
          - button "Activer le thème sombre" [ref=e151] [cursor=pointer]
          - button "Déconnexion" [ref=e154] [cursor=pointer]
      - main [ref=e159]:
        - generic [ref=e160]:
          - generic [ref=e162]:
            - heading "Plans & tarification" [level=1] [ref=e163]
            - paragraph [ref=e164]: Plans tarifaires, règles de commission et packs de crédits IA (ADM-13 à ADM-19).
          - generic [ref=e165]:
            - tablist [ref=e166]:
              - tab "Plans" [selected] [ref=e167] [cursor=pointer]
              - tab "Règles de commission" [ref=e168] [cursor=pointer]
              - tab "Packs de crédits IA" [ref=e169] [cursor=pointer]
            - tabpanel "Plans" [ref=e170]:
              - generic [ref=e171]:
                - generic [ref=e172]:
                  - search [ref=e173]:
                    - generic [ref=e174]: Rechercher dans la liste
                    - generic [ref=e175]:
                      - searchbox "Rechercher dans la liste" [ref=e176]
                      - generic [aria-hidden]: /
                  - generic [ref=e178]:
                    - button "Choisir les colonnes affichées" [ref=e179] [cursor=pointer]: Colonnes
                    - button "Exporter" [ref=e182] [cursor=pointer]
                    - link "Nouveau plan" [ref=e186] [cursor=pointer]:
                      - /url: /plans/new
                - status [ref=e188]: 1 résultat
                - table [ref=e191]:
                  - rowgroup [ref=e192]:
                    - row [ref=e193]:
                      - columnheader "Plan" [ref=e194]:
                        - button "Plan" [ref=e195] [cursor=pointer]
                      - columnheader "Prix actifs" [ref=e199]:
                        - button "Prix actifs" [ref=e200] [cursor=pointer]
                      - columnheader "Quotas" [ref=e204]
                      - columnheader "Fonctionnalités" [ref=e205]
                      - columnheader "Statut" [ref=e206]:
                        - button "Statut" [ref=e207] [cursor=pointer]
                      - columnheader "Actions" [ref=e211]
                  - rowgroup [ref=e213]:
                    - row [ref=e214]:
                      - cell "Démo" [ref=e215]
                      - 'cell "Annuel : 0 XOF" [ref=e217]'
                      - 'cell "Formations : 100 Apprenants actifs : 1 000 Gestionnaires : 20 Stockage : 50 Go Sessions live / mois : 50" [ref=e220]':
                        - generic [ref=e221]:
                          - generic [ref=e222]: "Formations : 100"
                          - generic [ref=e223]: "Apprenants actifs : 1 000"
                          - generic [ref=e224]: "Gestionnaires : 20"
                          - generic [ref=e225]: "Stockage : 50 Go"
                          - generic [ref=e226]: "Sessions live / mois : 50"
                      - 'cell "Traduction IA : Oui (0 crédits) Certificats personnalisés : Oui Domaine personnalisé : Non" [ref=e227]':
                        - generic [ref=e228]:
                          - generic [ref=e229]: "Traduction IA : Oui (0 crédits)"
                          - generic [ref=e230]: "Certificats personnalisés : Oui"
                          - generic [ref=e231]: "Domaine personnalisé : Non"
                      - cell "Actif Public" [ref=e232]:
                        - generic [ref=e233]:
                          - generic [ref=e234]: Actif
                          - generic [ref=e235]: Public
                      - cell [ref=e236]:
                        - button "Actions pour le plan Démo" [ref=e237] [cursor=pointer]
                - navigation "Pagination" [ref=e242]:
                  - paragraph [ref=e243]: Affichage de 1 à 1 sur 1 résultat
                  - generic [ref=e244]:
                    - generic [ref=e245]:
                      - generic [ref=e246]: Lignes par page
                      - combobox "Lignes par page" [ref=e247] [cursor=pointer]:
                        - generic: "10"
                    - generic [ref=e250]:
                      - button "Première page" [disabled]
                      - button "Précédent" [disabled]
                      - generic [ref=e251]: Page 1 sur 1
                      - button "Suivant" [disabled]
                      - button "Dernière page" [disabled]
  - region "Notifications"
  - button "Open Next.js Dev Tools" [ref=e257] [cursor=pointer]
  - alert [ref=e261]
```

# Test source

```ts
  1  | import AxeBuilder from "@axe-core/playwright";
  2  | import { mkdirSync, writeFileSync } from "node:fs";
  3  | import path from "node:path";
  4  | 
  5  | import { expect, test } from "@playwright/test";
  6  | import type { Page } from "@playwright/test";
  7  | 
  8  | /** Tags WCAG 2.1 niveaux A et AA. */
  9  | export const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];
  10 | 
  11 | export interface AllowlistEntry {
  12 |   /** Identifiant de la règle axe (ex. « color-contrast »). */
  13 |   rule: string;
  14 |   /** Sous-chaîne d'un sélecteur CSS de nœud : sans elle, toute la règle serait ignorée, ce qui est refusé. */
  15 |   selector: string;
  16 |   /** Justification OBLIGATOIRE (faux positif connu, composant tiers…). */
  17 |   reason: string;
  18 | }
  19 | 
  20 | export interface A11yOptions {
  21 |   /** Sélecteurs CSS exclus de l'analyse (contenu tiers : iframe vidéo, etc.). */
  22 |   exclude?: string[];
  23 |   allowlist?: AllowlistEntry[];
  24 |   label?: string;
  25 | }
  26 | 
  27 | const BLOCKING = new Set(["critical", "serious"]);
  28 | 
  29 | /**
  30 |  * Exécute axe (WCAG 2.1 A + AA) et échoue sur toute violation critical/serious non allowlistée.
  31 |  * Les violations minor/moderate sont journalisées (console + annotation du test) sans faire échouer.
  32 |  */
  33 | export async function expectNoA11yViolations(page: Page, options: A11yOptions = {}) {
  34 |   for (const entry of options.allowlist ?? []) {
  35 |     if (!entry.reason.trim() || !entry.selector.trim()) {
  36 |       throw new Error(`Allowlist invalide pour ${entry.rule} : sélecteur et justification obligatoires.`);
  37 |     }
  38 |   }
  39 |   await page.waitForLoadState("load");
  40 |   await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => undefined);
  41 |   await page.waitForTimeout(600); // fin des transitions CSS (contrastes calculés sur des états transitoires sinon)
  42 | 
  43 |   let builder = new AxeBuilder({ page }).withTags(WCAG_TAGS);
  44 |   for (const selector of options.exclude ?? []) builder = builder.exclude(selector);
  45 |   const results = await builder.analyze();
  46 | 
  47 |   const allowed = (rule: string, targets: string) =>
  48 |     (options.allowlist ?? []).some((a) => a.rule === rule && targets.includes(a.selector));
  49 |   const violations = results.violations
  50 |     .map((v) => ({ ...v, nodes: v.nodes.filter((n) => !allowed(v.id, n.target.join(" "))) }))
  51 |     .filter((v) => v.nodes.length > 0);
  52 | 
  53 |   const label = options.label ?? page.url();
  54 |   // Rapport JSON brut par page (toutes gravités, avant allowlist) : e2e/a11y-report/.
  55 |   try {
  56 |     const dir = path.join(__dirname, "..", "a11y-report");
  57 |     mkdirSync(dir, { recursive: true });
  58 |     const summary = results.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.map((n) => n.target.join(" ")) }));
  59 |     writeFileSync(path.join(dir, `${label.replace(/[^a-z0-9]+/gi, "_")}.json`), JSON.stringify({ label, url: page.url(), violations: summary, passes: results.passes.length }, null, 2));
  60 |   } catch {
  61 |     /* rapport facultatif */
  62 |   }
  63 |   const format = (v: (typeof violations)[number]) =>
  64 |     `[${v.impact}] ${v.id} (${v.nodes.length}) ${v.help}\n` +
  65 |     v.nodes
  66 |       .slice(0, 4)
  67 |       .map((n) => `    - ${n.target.join(" ")} :: ${(n.failureSummary ?? "").split("\n").slice(1, 3).join(" | ")}`)
  68 |       .join("\n");
  69 | 
  70 |   const minor = violations.filter((v) => !BLOCKING.has(v.impact ?? ""));
  71 |   if (minor.length > 0) {
  72 |     const text = minor.map(format).join("\n");
  73 |     console.log(`a11y (non bloquant) ${label}\n${text}`);
  74 |     test.info().annotations.push({ type: "a11y-minor", description: text });
  75 |   }
  76 |   const blocking = violations.filter((v) => BLOCKING.has(v.impact ?? ""));
> 77 |   expect(blocking.map(format).join("\n"), `Violations axe critical/serious sur ${label}`).toBe("");
     |                                                                                           ^ Error: Violations axe critical/serious sur admin /plans light
  78 | }
  79 | 
  80 | /** Force le thème sombre/clair avant la navigation (clé localStorage lue par le script de thème du front). */
  81 | export async function setTheme(page: Page, front: "admin" | "business", theme: "light" | "dark") {
  82 |   await page.addInitScript(
  83 |     ([key, value]) => {
  84 |       try {
  85 |         localStorage.setItem(key as string, value as string);
  86 |       } catch {
  87 |         /* stockage indisponible */
  88 |       }
  89 |     },
  90 |     [`${front}-theme`, theme],
  91 |   );
  92 | }
  93 | 
```