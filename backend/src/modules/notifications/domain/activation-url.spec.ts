import { buildActivationUrl } from "./activation-url";

const base = { token: "abc123", baseDomain: "exemple.test", backofficeSuffix: "-backoffice" };

describe("buildActivationUrl", () => {
  it("compte plateforme -> hôte admin", () => {
    expect(buildActivationUrl({ ...base, userType: "PLATFORM_ADMIN", tenantSlug: null })).toBe(
      "https://admin.exemple.test/activate?token=abc123",
    );
  });

  it("utilisateur entreprise -> hôte <slug>-backoffice", () => {
    expect(buildActivationUrl({ ...base, userType: "COMPANY_USER", tenantSlug: "acme" })).toBe(
      "https://acme-backoffice.exemple.test/activate?token=abc123",
    );
  });

  it("apprenant -> hôte <slug> (learning)", () => {
    expect(buildActivationUrl({ ...base, userType: "LEARNER", tenantSlug: "acme" })).toBe(
      "https://acme.exemple.test/activate?token=abc123",
    );
  });

  it("entreprise/apprenant sans slug connu -> repli sur l'hôte admin", () => {
    expect(buildActivationUrl({ ...base, userType: "LEARNER", tenantSlug: null })).toContain("https://admin.");
  });

  it("respecte le protocole fourni et encode le jeton", () => {
    expect(buildActivationUrl({ ...base, userType: "LEARNER", tenantSlug: "a", protocol: "http", token: "a b&c" })).toBe(
      "http://a.exemple.test/activate?token=a%20b%26c",
    );
  });

  it("peut cibler une autre page (réinitialisation du mot de passe)", () => {
    expect(
      buildActivationUrl({ ...base, userType: "LEARNER", tenantSlug: "acme", path: "/reset-password" }),
    ).toBe("https://acme.exemple.test/reset-password?token=abc123");
  });
});
