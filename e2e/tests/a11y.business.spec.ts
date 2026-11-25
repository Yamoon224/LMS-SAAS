import { expect, test } from "@playwright/test";

import { expectNoA11yViolations, setTheme } from "./a11y.helpers";

// Serveurs de dev lents (compilation à la demande) : délai large par test.
test.setTimeout(240_000);

const anonymous = { cookies: [], origins: [] };
const authed = [{ name: "tableau de bord", path: "/" }, { name: "cours", path: "/courses" }, { name: "abonnement", path: "/subscription" }, { name: "certificats", path: "/certificates" }, { name: "utilisateurs", path: "/users" } ];

test.describe("a11y business — connexion", () => {
  test.use({ storageState: anonymous });
  for (const theme of ["light", "dark"] as const) {
    test(`login ${theme}`, async ({ page }) => {
      await setTheme(page, "business", theme);
      await page.goto("/login", { waitUntil: "domcontentloaded", timeout: 150_000 });
      await expectNoA11yViolations(page, { label: `business /login ${theme}` });
    });
  }
  test("login mobile 390px", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/login", { waitUntil: "domcontentloaded", timeout: 150_000 });
    await expectNoA11yViolations(page, { label: "business /login mobile" });
  });
});

test.describe("a11y business — connecté", () => {
  for (const theme of ["light", "dark"] as const) {
    for (const p of authed) {
      test(`${p.name} ${theme}`, async ({ page }) => {
        await setTheme(page, "business", theme);
        await page.goto(p.path, { waitUntil: "domcontentloaded", timeout: 150_000 });
        await expect(page).not.toHaveURL(/\/login/);
        await expectNoA11yViolations(page, { label: `business ${p.path} ${theme}` });
      });
    }
  }
  test("tableau de bord mobile 390px", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/", { waitUntil: "domcontentloaded", timeout: 150_000 });
    await expectNoA11yViolations(page, { label: "business / mobile" });
  });
});
