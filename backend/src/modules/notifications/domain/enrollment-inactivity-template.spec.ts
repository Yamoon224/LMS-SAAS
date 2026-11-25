import { renderTemplate } from "./notification-template";
import { allowedVariables, knownTemplateKeys, validateOverride } from "./template-overrides";

describe("gabarit enrollment.inactivity-reminder (PUB-18)", () => {
  const payload = { firstName: "Awa", courseTitle: "Python", daysInactive: 9 };

  it("existe en français et en anglais avec le titre de la formation et le nombre de jours", () => {
    const fr = renderTemplate("enrollment.inactivity-reminder", "fr", payload);
    expect(fr.subject).toBe("Votre formation vous attend");
    expect(fr.body).toContain("Python");
    expect(fr.body).toContain("9 jours");
    const en = renderTemplate("enrollment.inactivity-reminder", "en", payload);
    expect(en.subject).toBe("Your course is waiting for you");
    expect(en.body).toContain("9 days");
  });

  it("se replie sur le français pour une autre langue", () => {
    expect(renderTemplate("enrollment.inactivity-reminder", "de", payload).subject).toBe("Votre formation vous attend");
  });

  it("est surchargeable avec ses variables propres", () => {
    expect(knownTemplateKeys()).toContain("enrollment.inactivity-reminder");
    expect(allowedVariables("enrollment.inactivity-reminder")).toEqual(
      expect.arrayContaining(["firstName", "courseTitle", "daysInactive"]),
    );
    expect(() =>
      validateOverride("enrollment.inactivity-reminder", "On vous attend", "{{firstName}}, reprenez {{courseTitle}} ({{daysInactive}} j)."),
    ).not.toThrow();
  });
});
