import { orderOptionsForAttempt } from "./option-order";

const options = [
  { id: "c", order: 2 },
  { id: "a", order: 0 },
  { id: "d", order: 3 },
  { id: "b", order: 1 },
];

describe("orderOptionsForAttempt", () => {
  it("sans mélange: ordre configuré, entrée non mutée", () => {
    expect(orderOptionsForAttempt(options, false, "seed").map((o) => o.id)).toEqual(["a", "b", "c", "d"]);
    expect(options.map((o) => o.id)).toEqual(["c", "a", "d", "b"]);
  });

  it("avec mélange: déterministe pour une même graine, même contenu", () => {
    const first = orderOptionsForAttempt(options, true, "attempt-1:q-1").map((o) => o.id);
    const second = orderOptionsForAttempt(options, true, "attempt-1:q-1").map((o) => o.id);
    expect(first).toEqual(second);
    expect([...first].sort()).toEqual(["a", "b", "c", "d"]);
  });

  it("des graines différentes peuvent produire des ordres différents", () => {
    const orders = new Set(
      Array.from({ length: 20 }, (_, i) => orderOptionsForAttempt(options, true, `seed-${i}`).map((o) => o.id).join("")),
    );
    expect(orders.size).toBeGreaterThan(1);
  });
});
