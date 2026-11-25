import { buildPaymentCallbackUrl } from "./payment-callback-url";

describe("buildPaymentCallbackUrl", () => {
  it("construit l'URL sur l'hôte d'apprentissage du tenant", () => {
    expect(buildPaymentCallbackUrl({ tenantSlug: "acme", baseDomain: "exemple.test", enrollmentId: "e-1" })).toBe(
      "https://acme.exemple.test/my-learning/e-1?payment=return",
    );
  });

  it("respecte le protocole et encode l'identifiant", () => {
    expect(
      buildPaymentCallbackUrl({ tenantSlug: "a", baseDomain: "x.test", protocol: "http", enrollmentId: "a/b" }),
    ).toBe("http://a.x.test/my-learning/a%2Fb?payment=return");
  });
});
