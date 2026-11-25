import { hasTemplate, renderTemplate } from "./notification-template";

describe("gabarits de remboursement (ENT-70)", () => {
  it.each(["refund.requested", "refund.accepted", "refund.rejected", "refund.refunded"])("%s existe", (key) => {
    expect(hasTemplate(key)).toBe(true);
  });

  it("le refus communique le motif de l'entreprise", () => {
    const { body } = renderTemplate("refund.rejected", "fr", {
      courseTitle: "Excel avancé",
      note: "Progression supérieure à 20 %",
    });
    expect(body).toContain("Excel avancé");
    expect(body).toContain("Progression supérieure à 20 %");
  });

  it("la demande à l'entreprise nomme la formation et le montant, dans les deux langues", () => {
    const payload = { courseTitle: "Excel avancé", amount: 25000, currency: "XOF" };
    expect(renderTemplate("refund.requested", "fr", payload).body).toContain('"Excel avancé" (25000 XOF)');
    expect(renderTemplate("refund.requested", "en", payload).subject).toBe("New refund request");
  });

  it("l'acceptation et le remboursement indiquent le montant", () => {
    const payload = { courseTitle: "Excel avancé", amount: 25000, currency: "XOF" };
    expect(renderTemplate("refund.accepted", "fr", payload).body).toContain("25000 XOF");
    expect(renderTemplate("refund.refunded", "en", payload).body).toContain("25000 XOF");
  });
});

describe("gabarit de réinitialisation de mot de passe (PUB-04)", () => {
  it("contient le lien et précise sa durée de validité", () => {
    const { body } = renderTemplate("user.password-reset", "fr", { resetUrl: "https://acme.test/reset-password?token=x" });
    expect(body).toContain("https://acme.test/reset-password?token=x");
    expect(body).toContain("1 heure");
  });
});
