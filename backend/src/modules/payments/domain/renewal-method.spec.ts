import { pickRenewalMethod } from "./renewal-method";

describe("pickRenewalMethod", () => {
  it("préfère le mobile money à la carte", () => {
    expect(pickRenewalMethod(["CARD", "WAVE"])).toBe("WAVE");
    expect(pickRenewalMethod(["CARD", "MTN_MOMO", "ORANGE_MONEY"])).toBe("ORANGE_MONEY");
  });

  it("retombe sur la carte puis sur un autre moyen", () => {
    expect(pickRenewalMethod(["OTHER", "CARD"])).toBe("CARD");
    expect(pickRenewalMethod(["OTHER"])).toBe("OTHER");
  });

  it("retourne null sans moyen disponible", () => {
    expect(pickRenewalMethod([])).toBeNull();
  });
});
