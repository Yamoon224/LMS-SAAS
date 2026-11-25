import { extractPublicBranding } from "./public-branding";

describe("extractPublicBranding", () => {
  it("retourne des null pour une forme inconnue", () => {
    for (const input of [null, undefined, 42, "x", [], {}]) {
      expect(extractPublicBranding(input)).toEqual({ logoUrl: null, primaryColor: null, bannerUrl: null, description: null });
    }
  });

  it("lit logoUrl / primaryColor directs", () => {
    expect(extractPublicBranding({ logoUrl: "https://cdn.x/logo.png", primaryColor: "#112233" })).toEqual({
      logoUrl: "https://cdn.x/logo.png",
      primaryColor: "#112233",
      bannerUrl: null,
      description: null,
    });
  });

  it("lit les variantes imbriquées", () => {
    expect(extractPublicBranding({ logo: { url: "/img/l.png" }, colors: { primary: "#fff" } })).toEqual({
      logoUrl: "/img/l.png",
      primaryColor: "#fff",
      bannerUrl: null,
      description: null,
    });
  });

  it("rejette les URLs dangereuses et les couleurs invalides, et n'expose aucun champ interne", () => {
    const result = extractPublicBranding({
      logoUrl: "javascript:alert(1)",
      primaryColor: "red; background:url(x)",
      secret: "interne",
    });
    expect(result).toEqual({ logoUrl: null, primaryColor: null, bannerUrl: null, description: null });
    expect(Object.keys(result).sort()).toEqual(["bannerUrl", "description", "logoUrl", "primaryColor"]);
  });

  it("rejette une URL protocole-relatif et data:", () => {
    expect(extractPublicBranding({ logo: "//evil.tld/x.png" }).logoUrl).toBeNull();
    expect(extractPublicBranding({ logo: "data:image/png;base64,AAA" }).logoUrl).toBeNull();
  });

  it("lit la bannière et la description (tronquée), rejette une bannière dangereuse", () => {
    const ok = extractPublicBranding({ bannerUrl: "https://cdn.x/b.jpg", description: `  ${"a".repeat(900)}  ` });
    expect(ok.bannerUrl).toBe("https://cdn.x/b.jpg");
    expect(ok.description).toHaveLength(600);
    expect(extractPublicBranding({ banner: "javascript:alert(1)", description: 42 })).toMatchObject({
      bannerUrl: null,
      description: null,
    });
  });
});
