import { expect, test } from "@playwright/test";

test.describe("Business (propriétaire)", () => {
  test("(b) connecté, le tableau de bord s'affiche", async ({ page }) => {
    await page.goto("/");
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.getByRole("heading", { name: "Tableau de bord", level: 1 })).toBeVisible();
  });
});

test.describe("Business mobile (390px)", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("(e) le menu burger ouvre puis ferme le tiroir de navigation", async ({ page }) => {
    await page.goto("/");
    const burger = page.getByRole("button", { name: "Ouvrir le menu de navigation" });
    await expect(burger).toBeVisible();
    await burger.click();
    const drawer = page.getByRole("dialog", { name: "Menu de navigation" });
    await expect(drawer).toBeVisible();
    await drawer.getByRole("button", { name: "Fermer le menu" }).click();
    await expect(drawer).toBeHidden();
  });
});
