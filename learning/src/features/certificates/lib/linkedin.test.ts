import { describe, expect, it } from "vitest";

import { linkedInAddToProfileUrl, verificationUrl } from "./linkedin";

describe("linkedInAddToProfileUrl", () => {
  it("construit le lien avec tous les paramètres", () => {
    const url = new URL(
      linkedInAddToProfileUrl({
        name: "Bases de Python",
        organizationName: "École Awa",
        issuedAt: "2026-03-15T10:00:00Z",
        certUrl: "https://ecole.example.com/verify/CERT-2026-0001",
        certId: "CERT-2026-0001",
      }),
    );
    expect(url.origin + url.pathname).toBe("https://www.linkedin.com/profile/add");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      startTask: "CERTIFICATION_NAME",
      name: "Bases de Python",
      organizationName: "École Awa",
      issueYear: "2026",
      issueMonth: "3",
      certUrl: "https://ecole.example.com/verify/CERT-2026-0001",
      certId: "CERT-2026-0001",
    });
  });

  it("encode les caractères réservés : aucun paramètre ne peut en injecter un autre", () => {
    const raw = linkedInAddToProfileUrl({
      name: "A&B=C#D?E",
      organizationName: "X&issueYear=1999",
      issuedAt: "2026-01-01T00:00:00Z",
      certUrl: "https://e.example/verify/N°1?x=1&y=2",
      certId: "a b/c",
    });
    expect(raw).not.toContain("A&B");
    expect(raw).toContain("name=A%26B%3DC%23D%3FE");
    expect(raw).toContain("organizationName=X%26issueYear%3D1999");
    expect(raw).toContain("certUrl=https%3A%2F%2Fe.example%2Fverify%2FN%C2%B01%3Fx%3D1%26y%3D2");
    expect(new URL(raw).searchParams.getAll("issueYear")).toEqual(["2026"]);
    expect(new URL(raw).searchParams.get("certId")).toBe("a b/c");
  });

  it("omet année et mois si la date est absente ou invalide", () => {
    for (const issuedAt of [null, undefined, "pas une date"]) {
      const params = new URL(
        linkedInAddToProfileUrl({ name: "N", organizationName: "O", issuedAt, certUrl: "u", certId: "i" }),
      ).searchParams;
      expect(params.has("issueYear")).toBe(false);
      expect(params.has("issueMonth")).toBe(false);
    }
  });
});

describe("verificationUrl", () => {
  it("pointe vers la page publique et encode le numéro", () => {
    expect(verificationUrl("https://a.example/", "N 1/2")).toBe("https://a.example/verify/N%201%2F2");
  });
});
