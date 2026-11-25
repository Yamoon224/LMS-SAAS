import { InvalidAmountError, Money } from "./money.vo";

describe("Money value object", () => {
  it("creates a valid money amount and normalizes currency to uppercase", () => {
    const money = Money.create(50000, "xof");
    expect(money.amount).toBe(50000);
    expect(money.currency).toBe("XOF");
  });

  it.each([-1, 1.5, Number.NaN])("rejects a non-integer or negative amount: %s", (amount) => {
    expect(() => Money.create(amount, "XOF")).toThrow(InvalidAmountError);
  });

  it("adds two amounts of the same currency", () => {
    const a = Money.create(1000, "XOF");
    const b = Money.create(500, "XOF");
    expect(a.add(b).amount).toBe(1500);
  });

  it("rejects adding amounts of different currencies", () => {
    const xof = Money.create(1000, "XOF");
    const ngn = Money.create(1000, "NGN");
    expect(() => xof.add(ngn)).toThrow(InvalidAmountError);
  });

  it("subtracts within the available amount", () => {
    const a = Money.create(1000, "XOF");
    const b = Money.create(300, "XOF");
    expect(a.subtract(b).amount).toBe(700);
  });

  it("rejects subtracting more than the available amount", () => {
    const a = Money.create(500, "XOF");
    const b = Money.create(1000, "XOF");
    expect(() => a.subtract(b)).toThrow(InvalidAmountError);
  });

  it("computes a rounded percentage (BE-07, example from section 9.3)", () => {
    // Exemple du cahier des charges: commission 10% sur 50 000 FCFA = 5 000 FCFA.
    const price = Money.create(50000, "XOF");
    expect(price.percentage(10).amount).toBe(5000);
  });

  it("rounds a percentage to the nearest integer", () => {
    const price = Money.create(1001, "XOF");
    // 1001 * 2.5% = 25.025 → arrondi à 25.
    expect(price.percentage(2.5).amount).toBe(25);
  });
});
