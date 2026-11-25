import { test as setup, expect } from "@playwright/test";

import { urls } from "../playwright.config";

import { ACCOUNTS, PASSWORD, fillLogin } from "./helpers";

// Une seule connexion par front, réutilisée par les autres projets (évite le rate limiting du login).
const targets = [
  { name: "admin", url: urls.admin, email: ACCOUNTS.admin, landing: /\/$|\/tenants/ },
  { name: "business", url: urls.business, email: ACCOUNTS.business, landing: /\/$|\/dashboard/ },
  { name: "learning", url: urls.learning, email: ACCOUNTS.learner, landing: /\/my-learning/ },
];

for (const target of targets) {
  setup(`connexion ${target.name}`, async ({ page }) => {
    await page.goto(`${target.url}/login`);
    await fillLogin(page, target.email, PASSWORD);
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page).toHaveURL(target.landing);
    await page.context().storageState({ path: `./.auth/${target.name}.json` });
  });
}
