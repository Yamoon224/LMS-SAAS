import { breakDownOfflineSale, breakDownOnlineSale } from "./transaction";

describe("breakDownOnlineSale", () => {
  it("retrouve la commission du cahier des charges (50 000 brut, frais 1 250, net 43 750 → commission 5 000)", () => {
    expect(breakDownOnlineSale(50000, 1250, 43750)).toEqual({ commission: 5000, fee: 1250, net: 43750 });
  });

  it("laisse commission et net inconnus tant que le grand livre n'a pas la vente", () => {
    expect(breakDownOnlineSale(50000, 1250, null)).toEqual({ commission: null, fee: 1250, net: null });
  });

  it("ne renvoie jamais une commission négative", () => {
    expect(breakDownOnlineSale(1000, 500, 900).commission).toBe(0);
  });
});

describe("breakDownOfflineSale", () => {
  it("sans commission, le net égale le montant reçu", () => {
    expect(breakDownOfflineSale(25000, 0)).toEqual({ commission: 0, net: 25000 });
  });

  it("déduit la commission due", () => {
    expect(breakDownOfflineSale(25000, 2500)).toEqual({ commission: 2500, net: 22500 });
  });
});
