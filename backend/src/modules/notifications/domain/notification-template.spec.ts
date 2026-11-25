import { hasTemplate, renderTemplate } from "./notification-template";

describe("notification-template", () => {
  describe("renderTemplate", () => {
    it("rend le gabarit dans la langue demandée", () => {
      const result = renderTemplate("user.invited", "en", {
        firstName: "Kofi",
        activationUrl: "https://example.com/activate",
      });
      expect(result.subject).toBe("Your platform access");
      expect(result.body).toContain("Kofi");
      expect(result.body).toContain("https://example.com/activate");
    });

    it("se replie sur le français si la langue demandée n'a pas de gabarit", () => {
      const result = renderTemplate("user.invited", "de", {
        firstName: "Awa",
        activationUrl: "https://example.com/activate",
      });
      expect(result.subject).toBe("Votre accès à la plateforme");
    });

    it("lève une erreur si le gabarit n'existe pas du tout", () => {
      expect(() => renderTemplate("inexistant.template", "fr", {})).toThrow();
    });

    it("interpole correctement les variables numériques et de date", () => {
      const result = renderTemplate("payment.failed", "fr", { amount: 25000, currency: "XOF" });
      expect(result.body).toContain("25000");
      expect(result.body).toContain("XOF");
    });
  });

  describe("hasTemplate", () => {
    it("retourne true pour un gabarit existant", () => {
      expect(hasTemplate("user.invited")).toBe(true);
    });

    it("retourne false pour un gabarit inexistant", () => {
      expect(hasTemplate("inexistant.template")).toBe(false);
    });
  });
});

describe("renderTemplate erreurs", () => {
  it("lève une erreur pour une clé de gabarit inconnue", () => {
    expect(() => renderTemplate("inconnu.xyz", "fr", {})).toThrow("Gabarit de notification introuvable: inconnu.xyz");
  });

  it("retombe sur le français pour une langue sans gabarit", () => {
    const fr = renderTemplate("user.invited", "fr", { firstName: "Awa", activationUrl: "u" });
    expect(renderTemplate("user.invited", "zz", { firstName: "Awa", activationUrl: "u" })).toEqual(fr);
  });
});
