import { describe, expect, it } from "vitest";

import { absoluteUrl, resolveOrigin } from "./site-url";

describe("resolveOrigin", () => {
  it("préfère x-forwarded-host au host et utilise https en production", () => {
    expect(resolveOrigin({ host: "127.0.0.1:3000", forwardedHost: "ecole.exemple.com", production: true })).toBe(
      "https://ecole.exemple.com",
    );
  });

  it("respecte x-forwarded-proto, en ne gardant que http ou https", () => {
    expect(resolveOrigin({ host: "a.b", forwardedProto: "http", production: true })).toBe("http://a.b");
    expect(resolveOrigin({ host: "a.b", forwardedProto: "javascript", production: true })).toBe("https://a.b");
  });

  it("reste en http pour localhost, même en production", () => {
    expect(resolveOrigin({ host: "localhost:3000", production: true })).toBe("http://localhost:3000");
    expect(resolveOrigin({ host: "ecole.localhost:3000", production: false })).toBe("http://ecole.localhost:3000");
  });

  it("prend la première valeur d'une liste d'en-têtes proxy", () => {
    expect(resolveOrigin({ forwardedHost: "a.example.com, evil.com", production: true })).toBe("https://a.example.com");
  });

  it.each(["", "evil.com/path", "a b.com", "a.com\r\nX: y", "http://a.com", "a.com:99999999", "-a.com", "a.com@evil.com"])(
    "refuse un host malformé ou piégé : %j",
    (host) => {
      expect(resolveOrigin({ host, production: true })).toBeNull();
    },
  );

  it("retourne null sans aucun host", () => {
    expect(resolveOrigin({ production: true })).toBeNull();
  });
});

describe("absoluteUrl", () => {
  it("joint sans doubler les slashs", () => {
    expect(absoluteUrl("https://a.b/", "/courses/1")).toBe("https://a.b/courses/1");
    expect(absoluteUrl("https://a.b", "courses/1")).toBe("https://a.b/courses/1");
  });
});
