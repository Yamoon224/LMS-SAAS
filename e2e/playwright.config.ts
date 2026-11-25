import { defineConfig, devices } from "@playwright/test";

/**
 * E2E contre des serveurs DÉJÀ lancés (pnpm dev, ou stack docker) : aucun serveur n'est démarré ici.
 * Le navigateur est celui installé sur la machine (Chrome par défaut, E2E_CHANNEL=msedge pour Edge) :
 * aucun téléchargement de navigateur Playwright.
 *
 * Variables : E2E_ADMIN_URL, E2E_BUSINESS_URL, E2E_LEARNING_URL, E2E_API_URL, E2E_BASE_DOMAIN,
 * E2E_PASSWORD, E2E_ADMIN_EMAIL, E2E_BUSINESS_EMAIL, E2E_LEARNER_EMAIL, E2E_CHANNEL.
 *
 * E2E_BASE_DOMAIN doit valoir NEXT_PUBLIC_APP_BASE_DOMAIN des fronts (défaut « votredomaine.local ») : le
 * middleware ne résout le tenant que sous ce domaine (sur *.localhost, le login business répond 500).
 * Le navigateur mappe lui-même *.{domaine} et *.localhost vers 127.0.0.1 : pas de fichier hosts à éditer.
 */
const baseDomain = process.env.E2E_BASE_DOMAIN ?? "votredomaine.local";

export const urls = {
  admin: process.env.E2E_ADMIN_URL ?? "http://localhost:3002",
  business: process.env.E2E_BUSINESS_URL ?? `http://demo-backoffice.${baseDomain}:3003`,
  learning: process.env.E2E_LEARNING_URL ?? `http://demo.${baseDomain}:3004`,
  api: process.env.E2E_API_URL ?? "http://localhost:3001/v1",
};

const channel = process.env.E2E_CHANNEL ?? "chrome";
const launchOptions = {
  args: [`--host-resolver-rules=MAP *.${baseDomain} 127.0.0.1, MAP *.localhost 127.0.0.1`],
};
const browser = { ...devices["Desktop Chrome"], channel, launchOptions };
const authDir = "./.auth";

export default defineConfig({
  testDir: "./tests",
  outputDir: "./test-results",
  timeout: 90_000,
  globalTimeout: 20 * 60_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { outputFolder: "playwright-report", open: "never" }]],
  use: { trace: "retain-on-failure", screenshot: "only-on-failure", locale: "fr-FR" },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/, use: { ...browser } },
    {
      name: "admin",
      testMatch: /admin\..*\.spec\.ts/,
      dependencies: ["setup"],
      use: { ...browser, baseURL: urls.admin, storageState: `${authDir}/admin.json` },
    },
    {
      name: "business",
      testMatch: /business\..*\.spec\.ts/,
      dependencies: ["setup"],
      use: { ...browser, baseURL: urls.business, storageState: `${authDir}/business.json` },
    },
    {
      name: "learning",
      testMatch: /learning\..*\.spec\.ts/,
      dependencies: ["setup"],
      use: { ...browser, baseURL: urls.learning, storageState: `${authDir}/learning.json` },
    },
    // Accessibilité (axe, WCAG 2.1 A + AA) : même sessions que les parcours, specs a11y.<front>.spec.ts.
    ...(["admin", "business", "learning"] as const).map((front) => ({
      name: `a11y-${front}`,
      testMatch: new RegExp(String.raw`a11y\.${front}\.spec\.ts`),
      dependencies: ["setup"],
      use: { ...browser, baseURL: urls[front], storageState: `${authDir}/${front}.json` },
    })),
    {
      // Aucune session : pages publiques, erreurs de connexion.
      name: "public",
      testMatch: /public\..*\.spec\.ts/,
      use: { ...browser },
    },
  ],
});
