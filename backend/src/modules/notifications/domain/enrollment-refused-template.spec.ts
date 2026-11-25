import { hasTemplate, renderTemplate } from "./notification-template";
import { knownTemplateKeys } from "./template-overrides";

describe("gabarit enrollment.refused (ENT-61)", () => {
  it("existe et est modifiable dans l'Admin", () => {
    expect(hasTemplate("enrollment.refused")).toBe(true);
    expect(knownTemplateKeys()).toContain("enrollment.refused");
  });

  it("communique la formation et le motif, en français et en anglais", () => {
    const payload = { courseTitle: "Excel avancé", reason: "Virement non reçu" };
    const fr = renderTemplate("enrollment.refused", "fr", payload);
    expect(fr.subject).toBe("Inscription refusée");
    expect(fr.body).toContain("Excel avancé");
    expect(fr.body).toContain("Virement non reçu");
    const en = renderTemplate("enrollment.refused", "en", payload);
    expect(en.subject).toBe("Enrollment refused");
    expect(en.body).toContain("Virement non reçu");
  });
});
