import { InvalidStateTransitionError } from "@shared/errors";

import {
  assertEditable,
  assertPublishable,
  currentPublished,
  isLegalDocumentType,
  LegalDocumentIncompleteError,
  nextVersionNumber,
} from "./legal-document";
import type { LegalDocument } from "./legal-document";

const doc = (overrides: Partial<LegalDocument> = {}): LegalDocument => ({
  id: "d1",
  type: "TERMS_OF_USE",
  version: 1,
  title: "CGU",
  content: "Article 1.",
  publishedAt: null,
  createdAt: new Date("2026-01-01T00:00:00Z"),
  ...overrides,
});

describe("nextVersionNumber", () => {
  it("commence à 1", () => expect(nextVersionNumber([])).toBe(1));
  it("dépasse la plus haute version, même avec des trous", () => expect(nextVersionNumber([1, 4, 2])).toBe(5));
});

describe("assertEditable", () => {
  it("autorise un brouillon", () => expect(() => assertEditable(doc())).not.toThrow());

  it("interdit de modifier une version publiée", () => {
    expect(() => assertEditable(doc({ publishedAt: new Date() }))).toThrow(InvalidStateTransitionError);
  });
});

describe("assertPublishable", () => {
  it("accepte un brouillon complet", () => expect(() => assertPublishable(doc())).not.toThrow());

  it.each([
    ["titre vide", { title: "  " }],
    ["contenu vide", { content: "" }],
  ])("refuse un brouillon avec %s", (_label, overrides) => {
    expect(() => assertPublishable(doc(overrides))).toThrow(LegalDocumentIncompleteError);
  });

  it("refuse de republier une version déjà publiée", () => {
    expect(() => assertPublishable(doc({ publishedAt: new Date() }))).toThrow(InvalidStateTransitionError);
  });
});

describe("currentPublished", () => {
  it("renvoie la plus récente version publiée, en ignorant les brouillons", () => {
    const current = currentPublished([
      doc({ id: "v1", version: 1, publishedAt: new Date("2026-01-02") }),
      doc({ id: "v2", version: 2, publishedAt: new Date("2026-02-02") }),
      doc({ id: "v3", version: 3, publishedAt: null }),
    ]);
    expect(current?.id).toBe("v2");
  });

  it("renvoie null sans version publiée", () => {
    expect(currentPublished([doc()])).toBeNull();
    expect(currentPublished([])).toBeNull();
  });
});

describe("isLegalDocumentType", () => {
  it("reconnaît les trois types et rejette le reste", () => {
    expect(isLegalDocumentType("PRIVACY_POLICY")).toBe(true);
    expect(isLegalDocumentType("cgu")).toBe(false);
  });
});
