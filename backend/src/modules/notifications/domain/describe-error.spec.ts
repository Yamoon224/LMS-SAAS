import { describeError } from "./describe-error";

describe("describeError", () => {
  it("retourne le message d'une Error classique", () => {
    expect(describeError(new Error("boom"))).toBe("boom");
  });

  it("inclut le code et les erreurs internes d'un AggregateError au message vide", () => {
    const inner1 = Object.assign(new Error("connect ECONNREFUSED ::1:1025"), { code: "ECONNREFUSED" });
    const inner2 = Object.assign(new Error("connect ECONNREFUSED 127.0.0.1:1025"), { code: "ECONNREFUSED" });
    const aggregate = Object.assign(new AggregateError([inner1, inner2], ""), { code: "ECONNREFUSED" });
    const text = describeError(aggregate);
    expect(text).toContain("[ECONNREFUSED]");
    expect(text).toContain("::1:1025");
    expect(text).toContain("127.0.0.1:1025");
  });

  it("retombe sur le nom de l'erreur, puis un texte générique", () => {
    expect(describeError(new AggregateError([], ""))).toBe("AggregateError");
    expect(describeError(undefined)).toContain("inconnue");
    expect(describeError("texte")).toBe("texte");
  });
});

describe("describeError cas limites", () => {
  it("convertit une valeur primitive non textuelle en chaîne", () => {
    expect(describeError(42)).toBe("42");
  });

  it("retombe sur le texte générique pour un objet vide ou null", () => {
    expect(describeError({})).toContain("inconnue");
    expect(describeError(null)).toContain("inconnue");
  });

  it("n'explore pas les erreurs internes au-delà de deux niveaux", () => {
    const deep = { errors: [{ errors: [{ errors: [{ message: "trop-profond" }] }] }] };
    expect(describeError(deep)).not.toContain("trop-profond");
  });
});
