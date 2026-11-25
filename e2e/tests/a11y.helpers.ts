import AxeBuilder from "@axe-core/playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

/** Tags WCAG 2.1 niveaux A et AA. */
export const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

export interface AllowlistEntry {
  /** Identifiant de la règle axe (ex. « color-contrast »). */
  rule: string;
  /** Sous-chaîne d'un sélecteur CSS de nœud : sans elle, toute la règle serait ignorée, ce qui est refusé. */
  selector: string;
  /** Justification OBLIGATOIRE (faux positif connu, composant tiers…). */
  reason: string;
}

export interface A11yOptions {
  /** Sélecteurs CSS exclus de l'analyse (contenu tiers : iframe vidéo, etc.). */
  exclude?: string[];
  allowlist?: AllowlistEntry[];
  label?: string;
}

const BLOCKING = new Set(["critical", "serious"]);

/**
 * Exécute axe (WCAG 2.1 A + AA) et échoue sur toute violation critical/serious non allowlistée.
 * Les violations minor/moderate sont journalisées (console + annotation du test) sans faire échouer.
 */
export async function expectNoA11yViolations(page: Page, options: A11yOptions = {}) {
  for (const entry of options.allowlist ?? []) {
    if (!entry.reason.trim() || !entry.selector.trim()) {
      throw new Error(`Allowlist invalide pour ${entry.rule} : sélecteur et justification obligatoires.`);
    }
  }
  await page.waitForLoadState("load");
  await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => undefined);
  await page.waitForTimeout(600); // fin des transitions CSS (contrastes calculés sur des états transitoires sinon)

  let builder = new AxeBuilder({ page }).withTags(WCAG_TAGS);
  for (const selector of options.exclude ?? []) builder = builder.exclude(selector);
  const results = await builder.analyze();

  const allowed = (rule: string, targets: string) =>
    (options.allowlist ?? []).some((a) => a.rule === rule && targets.includes(a.selector));
  const violations = results.violations
    .map((v) => ({ ...v, nodes: v.nodes.filter((n) => !allowed(v.id, n.target.join(" "))) }))
    .filter((v) => v.nodes.length > 0);

  const label = options.label ?? page.url();
  // Rapport JSON brut par page (toutes gravités, avant allowlist) : e2e/a11y-report/.
  try {
    const dir = path.join(__dirname, "..", "a11y-report");
    mkdirSync(dir, { recursive: true });
    const summary = results.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.map((n) => n.target.join(" ")) }));
    writeFileSync(path.join(dir, `${label.replace(/[^a-z0-9]+/gi, "_")}.json`), JSON.stringify({ label, url: page.url(), violations: summary, passes: results.passes.length }, null, 2));
  } catch {
    /* rapport facultatif */
  }
  const format = (v: (typeof violations)[number]) =>
    `[${v.impact}] ${v.id} (${v.nodes.length}) ${v.help}\n` +
    v.nodes
      .slice(0, 4)
      .map((n) => `    - ${n.target.join(" ")} :: ${(n.failureSummary ?? "").split("\n").slice(1, 3).join(" | ")}`)
      .join("\n");

  const minor = violations.filter((v) => !BLOCKING.has(v.impact ?? ""));
  if (minor.length > 0) {
    const text = minor.map(format).join("\n");
    console.log(`a11y (non bloquant) ${label}\n${text}`);
    test.info().annotations.push({ type: "a11y-minor", description: text });
  }
  const blocking = violations.filter((v) => BLOCKING.has(v.impact ?? ""));
  expect(blocking.map(format).join("\n"), `Violations axe critical/serious sur ${label}`).toBe("");
}

/** Force le thème sombre/clair avant la navigation (clé localStorage lue par le script de thème du front). */
export async function setTheme(page: Page, front: "admin" | "business", theme: "light" | "dark") {
  await page.addInitScript(
    ([key, value]) => {
      try {
        localStorage.setItem(key as string, value as string);
      } catch {
        /* stockage indisponible */
      }
    },
    [`${front}-theme`, theme],
  );
}
