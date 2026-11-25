import { InvalidSlugError, Slug } from "./slug.vo";

describe("Slug", () => {
  it("normalise (trim + minuscules) et expose sa valeur", () => {
    const slug = Slug.create("  Acme-Formation ");
    expect(slug.value).toBe("acme-formation");
    expect(slug.toString()).toBe("acme-formation");
  });

  it.each(["acme formation", "-acme", "acme-", "acme_x", "", "a--b"])("refuse le format invalide %p", (raw) => {
    expect(() => Slug.create(raw)).toThrow(InvalidSlugError);
  });

  it.each(["admin", "api", "acme-backoffice"])("refuse le slug réservé %p", (raw) => {
    expect(() => Slug.create(raw)).toThrow(/réservé/);
  });
});
