import { expect, test } from "@playwright/test";

test.describe("Learning (apprenant)", () => {
  test("(c) connecté, « Mon apprentissage » s'affiche", async ({ page }) => {
    await page.goto("/my-learning");
    await expect(page).toHaveURL(/\/my-learning/);
    await expect(page.getByRole("heading", { name: "Mon apprentissage", level: 1 })).toBeVisible();
  });

  test("un apprenant connecté quittant /login est renvoyé vers « Mon apprentissage »", async ({ page }) => {
    await page.goto("/login");
    await expect(page).toHaveURL(/\/my-learning/);
  });
});
