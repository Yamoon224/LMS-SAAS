import { expect } from "@playwright/test";
import type { Page } from "@playwright/test";

export const PASSWORD = process.env.E2E_PASSWORD ?? "ChangeMe123!";
export const ACCOUNTS = {
  admin: process.env.E2E_ADMIN_EMAIL ?? "admin@votredomaine.local",
  business: process.env.E2E_BUSINESS_EMAIL ?? "business@votredomaine.local",
  learner: process.env.E2E_LEARNER_EMAIL ?? "learner@votredomaine.local",
};

/** Champs de connexion : les libellés diffèrent légèrement (« E-mail » / « Adresse e-mail »). */
export async function fillLogin(page: Page, email: string, password: string) {
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: /Se connecter/ }).click();
}

/** Aucun défilement horizontal de la page (tolérance de 1 px pour les arrondis). */
export async function expectNoHorizontalOverflow(page: Page, label: string) {
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(scrollWidth, `${label} déborde horizontalement (${scrollWidth}px > ${clientWidth}px)`).toBeLessThanOrEqual(
    clientWidth + 1,
  );
}
