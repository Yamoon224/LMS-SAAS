import { describe, expect, it } from "vitest";

import { tenantPayoutAccountSchema } from "./payout-account.schema";

describe("tenantPayoutAccountSchema", () => {
  it("accepte un compte masqué", () => {
    const parsed = tenantPayoutAccountSchema.parse({
      account: { type: "BANK", operator: null, accountName: "Acme", maskedNumber: "***0189" },
      verified: false,
    });
    expect(parsed.account?.maskedNumber).toBe("***0189");
  });

  it("accepte l'absence de compte", () => {
    expect(tenantPayoutAccountSchema.parse({ account: null, verified: false }).account).toBeNull();
  });

  it("refuse une réponse mal formée", () => {
    expect(() => tenantPayoutAccountSchema.parse({ account: { type: "CRYPTO" }, verified: true })).toThrow();
    expect(() => tenantPayoutAccountSchema.parse({ account: null })).toThrow();
  });
});
