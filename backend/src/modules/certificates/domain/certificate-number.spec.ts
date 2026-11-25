import { buildCertificateNumber } from "./certificate-number";

describe("buildCertificateNumber (RG-13)", () => {
  it("construit un numéro au format CERT-AAAAMM-SUFFIXE", () => {
    const issuedAt = new Date("2026-03-15T10:00:00Z");
    expect(buildCertificateNumber(issuedAt, "abcd1234")).toBe("CERT-202603-ABCD1234");
  });

  it("met en majuscules le suffixe fourni", () => {
    const issuedAt = new Date("2026-01-01T00:00:00Z");
    expect(buildCertificateNumber(issuedAt, "xyz")).toBe("CERT-202601-XYZ");
  });

  it("pad le mois sur deux chiffres", () => {
    const issuedAt = new Date("2026-09-05T00:00:00Z");
    expect(buildCertificateNumber(issuedAt, "a1")).toBe("CERT-202609-A1");
  });
});
