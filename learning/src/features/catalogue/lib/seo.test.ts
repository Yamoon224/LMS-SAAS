import { describe, expect, it } from "vitest";

import { alternateLanguages, courseJsonLd, serializeJsonLd } from "./seo";

describe("courseJsonLd", () => {
  it("décrit la formation en schema.org Course", () => {
    const data = courseJsonLd({
      name: "Python",
      description: "Bases",
      url: "https://e.example/courses/1",
      imageUrl: "https://cdn/x.jpg",
      providerName: "École",
      price: 15000,
      currency: "XOF",
      language: "fr",
      instructors: ["Awa"],
    });
    expect(data).toMatchObject({
      "@type": "Course",
      name: "Python",
      inLanguage: "fr",
      provider: { name: "École" },
      offers: { price: 15000, priceCurrency: "XOF" },
      instructor: [{ "@type": "Person", name: "Awa" }],
    });
  });

  it("omet les champs absents", () => {
    const data = courseJsonLd({ name: "A", url: "u", providerName: "P", price: 0, currency: "XOF" });
    expect(data).not.toHaveProperty("description");
    expect(data).not.toHaveProperty("image");
    expect(data).not.toHaveProperty("instructor");
  });
});

describe("serializeJsonLd", () => {
  it("neutralise une fermeture de balise script injectée dans un titre", () => {
    const json = serializeJsonLd({ name: "</script><script>alert(1)</script> & co" });
    expect(json).not.toContain("<");
    expect(json).not.toContain(">");
    expect(JSON.parse(json)).toEqual({ name: "</script><script>alert(1)</script> & co" });
  });
});

describe("alternateLanguages", () => {
  it("n'émet rien avec une seule langue", () => {
    expect(alternateLanguages("/courses/1", ["fr"])).toBeUndefined();
    expect(alternateLanguages("/courses/1", ["fr", "FR"])).toBeUndefined();
  });

  it("liste chaque langue et x-default", () => {
    expect(alternateLanguages("/courses/1", ["fr", "en"])).toEqual({
      "x-default": "/courses/1",
      fr: "/courses/1?lang=fr",
      en: "/courses/1?lang=en",
    });
  });
});
