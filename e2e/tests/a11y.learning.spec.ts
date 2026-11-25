import { expect, test } from "@playwright/test";

import { expectNoA11yViolations } from "./a11y.helpers";

// Serveurs de dev lents (compilation à la demande) : délai large par test.
test.setTimeout(240_000);

const anonymous = { cookies: [], origins: [] };

test.describe("a11y learning — pages publiques", () => {
  test.use({ storageState: anonymous });
  const pages = ["/", "/courses", "/login", "/register", "/forgot-password", "/verify"];
  for (const path of pages) {
    test(`desktop ${path}`, async ({ page }) => {
      await page.goto(path, { waitUntil: "domcontentloaded", timeout: 150_000 });
      await expectNoA11yViolations(page, { label: `learning ${path}` });
    });
  }
  for (const path of ["/", "/courses", "/login"]) {
    test(`mobile 390px ${path}`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(path, { waitUntil: "domcontentloaded", timeout: 150_000 });
      await expectNoA11yViolations(page, { label: `learning mobile ${path}` });
    });
  }
});

test.describe("a11y learning — connecté", () => {
  for (const path of ["/my-learning", "/certificates", "/profile"]) {
    test(`desktop ${path}`, async ({ page }) => {
      await page.goto(path, { waitUntil: "domcontentloaded", timeout: 150_000 });
      await expect(page).not.toHaveURL(/\/login/);
      await expectNoA11yViolations(page, { label: `learning ${path}` });
    });
  }
  test("mobile 390px /my-learning", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/my-learning", { waitUntil: "domcontentloaded", timeout: 150_000 });
    await expectNoA11yViolations(page, { label: "learning mobile /my-learning" });
  });
});
