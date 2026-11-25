import { expect, test } from "@playwright/test";

test.describe("Admin", () => {
  test("(a) connecté, la liste des entreprises se charge", async ({ page }) => {
    await page.goto("/tenants");
    await expect(page.getByRole("heading", { name: "Entreprises", level: 1 })).toBeVisible();
    // Le tableau contient au moins l entreprise de démo.
    await expect(page.getByRole("cell", { name: "Entreprise Démo", exact: true })).toBeVisible();
  });

  test("tableau de bord global accessible", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Tableau de bord global" })).toBeVisible();
  });
});

test.describe("Admin mobile (390px)", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("(e) le menu burger ouvre puis ferme le tiroir de navigation", async ({ page }) => {
    await page.goto("/");
    const burger = page.getByRole("button", { name: "Ouvrir le menu de navigation" });
    await expect(burger).toBeVisible();
    await burger.click();
    const drawer = page.getByRole("dialog", { name: "Menu de navigation" });
    await expect(drawer).toBeVisible();
    await expect(drawer.getByRole("link", { name: "Entreprises" })).toBeVisible();
    await drawer.getByRole("button", { name: "Fermer le menu" }).click();
    await expect(drawer).toBeHidden();
  });

  test("le tiroir se ferme en choisissant une destination", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Ouvrir le menu de navigation" }).click();
    const drawer = page.getByRole("dialog", { name: "Menu de navigation" });
    await drawer.getByRole("link", { name: "Entreprises" }).click();
    await expect(page).toHaveURL(/\/tenants/);
    await expect(drawer).toBeHidden();
  });
});
