import { DEFAULT_DESIGN } from "./certificate-design";
import { CertificateTemplate } from "./certificate-template.entity";

describe("CertificateTemplate", () => {
  it("expose les propriétés reçues de la persistance", () => {
    const template = CertificateTemplate.fromPersistence({
      id: "tpl-1",
      tenantId: "t1",
      name: "Classique",
      design: DEFAULT_DESIGN,
      isDefault: true,
      createdAt: new Date("2026-01-01T00:00:00Z"),
    });
    expect(template.id).toBe("tpl-1");
    expect(template.tenantId).toBe("t1");
    expect(template.name).toBe("Classique");
    expect(template.design).toBe(DEFAULT_DESIGN);
    expect(template.isDefault).toBe(true);
  });
});
