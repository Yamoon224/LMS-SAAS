import { expect, test } from "@playwright/test";

import { urls } from "../playwright.config";

import { ACCOUNTS, expectNoHorizontalOverflow, fillLogin } from "./helpers";

const fronts = [
  { name: "admin", url: urls.admin, user: ACCOUNTS.admin, alert: /incorrect|invalide|identifiants|impossible/i },
  { name: "business", url: urls.business, user: ACCOUNTS.business, alert: /incorrect|invalide|identifiants|impossible/i },
  { name: "learning", url: urls.learning, user: ACCOUNTS.learner, alert: /incorrect|invalide|impossible/i },
];

test.describe("(d) mauvais mot de passe", () => {
  for (const front of fronts) {
    test(`${front.name} : message d'erreur et reste sur /login`, async ({ page }) => {
      await page.goto(`${front.url}/login`);
      await fillLogin(page, front.user, "Mauvais-Mot-De-Passe-1!");
      await expect(page.getByRole("alert").filter({ hasText: front.alert })).toBeVisible();
      await expect(page).toHaveURL(/\/login/);
    });
  }

  test("la validation locale empêche l'envoi d'un e-mail invalide (admin)", async ({ page }) => {
    await page.goto(`${urls.admin}/login`);
    await fillLogin(page, "pas-un-email", "x");
    await expect(page.getByText("Adresse e-mail invalide.")).toBeVisible();
  });
});

const publicPages: Array<{ front: string; url: string; paths: string[] }> = [
  { front: "admin", url: urls.admin, paths: ["/login", "/forgot-password"] },
  { front: "business", url: urls.business, paths: ["/login", "/forgot-password"] },
  {
    front: "learning",
    url: urls.learning,
    paths: ["/", "/courses", "/login", "/register", "/forgot-password", "/verify"],
  },
];

test.describe("(f) aucune page publique ne déborde à 390px", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  for (const { front, url, paths } of publicPages) {
    for (const path of paths) {
      test(`${front}${path}`, async ({ page }) => {
        const response = await page.goto(`${url}${path}`);
        expect(response?.status() ?? 0).toBeLessThan(400);
        await page.waitForLoadState("networkidle");
        await expectNoHorizontalOverflow(page, `${front}${path}`);
      });
    }
  }
});
