import { InvalidStateTransitionError, NotFoundDomainError } from "@shared/errors";

import {
  LegalDocumentIncompleteError,
  LegalDocumentUnknownTypeError,
  LegalDocumentVersionChangedError,
} from "../domain/legal-document";
import type { LegalDocument } from "../domain/legal-document";
import type { LegalRepositoryPort } from "../domain/legal.repository.port";

import {
  AcceptLegalDocumentUseCase,
  CreateLegalDraftUseCase,
  GetCurrentLegalDocumentUseCase,
  ListPendingLegalDocumentsUseCase,
  PublishLegalDocumentUseCase,
  UpdateLegalDraftUseCase,
} from "./legal.use-cases";

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

function buildRepository(documents: LegalDocument[]): jest.Mocked<LegalRepositoryPort> {
  return {
    listAll: jest.fn(),
    listByType: jest.fn().mockResolvedValue(documents),
    findById: jest.fn().mockImplementation(async (id: string) => documents.find((d) => d.id === id) ?? null),
    createDraft: jest.fn().mockImplementation(async (data) => doc({ ...data, id: "new" })),
    updateDraft: jest.fn().mockResolvedValue(undefined),
    markPublished: jest.fn().mockResolvedValue(undefined),
    findAcceptedDocumentIds: jest.fn().mockResolvedValue([]),
    recordAcceptance: jest.fn().mockResolvedValue(undefined),
  };
}

describe("CreateLegalDraftUseCase", () => {
  it("numérote la nouvelle version après la plus haute existante", async () => {
    const repository = buildRepository([doc({ version: 1 }), doc({ id: "d3", version: 3 })]);
    await new CreateLegalDraftUseCase(repository).execute({ type: "TERMS_OF_USE", title: " CGU 2 ", content: "x" });
    expect(repository.createDraft).toHaveBeenCalledWith({ type: "TERMS_OF_USE", version: 4, title: "CGU 2", content: "x" });
  });

  it("refuse un type inconnu", async () => {
    await expect(
      new CreateLegalDraftUseCase(buildRepository([])).execute({ type: "NOPE", title: "t", content: "c" }),
    ).rejects.toThrow(LegalDocumentUnknownTypeError);
  });
});

describe("UpdateLegalDraftUseCase", () => {
  it("modifie un brouillon", async () => {
    const repository = buildRepository([doc()]);
    await new UpdateLegalDraftUseCase(repository).execute("d1", { title: "Nouveau", content: "Texte" });
    expect(repository.updateDraft).toHaveBeenCalledWith("d1", { title: "Nouveau", content: "Texte" });
  });

  it("refuse de modifier une version publiée", async () => {
    const repository = buildRepository([doc({ publishedAt: new Date() })]);
    await expect(new UpdateLegalDraftUseCase(repository).execute("d1", { title: "t", content: "c" })).rejects.toThrow(
      InvalidStateTransitionError,
    );
    expect(repository.updateDraft).not.toHaveBeenCalled();
  });

  it("signale un document introuvable", async () => {
    await expect(
      new UpdateLegalDraftUseCase(buildRepository([])).execute("inconnu", { title: "t", content: "c" }),
    ).rejects.toThrow(NotFoundDomainError);
  });
});

describe("PublishLegalDocumentUseCase", () => {
  it("publie un brouillon complet", async () => {
    const repository = buildRepository([doc()]);
    await new PublishLegalDocumentUseCase(repository).execute("d1");
    expect(repository.markPublished).toHaveBeenCalledWith("d1", expect.any(Date));
  });

  it("refuse un brouillon vide ou une version déjà publiée", async () => {
    const empty = buildRepository([doc({ content: "  " })]);
    await expect(new PublishLegalDocumentUseCase(empty).execute("d1")).rejects.toThrow(LegalDocumentIncompleteError);
    const published = buildRepository([doc({ publishedAt: new Date() })]);
    await expect(new PublishLegalDocumentUseCase(published).execute("d1")).rejects.toThrow(InvalidStateTransitionError);
    expect(empty.markPublished).not.toHaveBeenCalled();
    expect(published.markPublished).not.toHaveBeenCalled();
  });
});

describe("GetCurrentLegalDocumentUseCase / AcceptLegalDocumentUseCase", () => {
  const documents = [
    doc({ id: "v1", version: 1, publishedAt: new Date("2026-01-02") }),
    doc({ id: "v2", version: 2, publishedAt: new Date("2026-02-02") }),
    doc({ id: "v3", version: 3, publishedAt: null }),
  ];

  it("sert la dernière version publiée, jamais un brouillon", async () => {
    const current = await new GetCurrentLegalDocumentUseCase(buildRepository(documents)).execute("TERMS_OF_USE");
    expect(current.id).toBe("v2");
  });

  it("signale l'absence de version publiée", async () => {
    await expect(new GetCurrentLegalDocumentUseCase(buildRepository([doc()])).execute("TERMS_OF_USE")).rejects.toThrow(
      NotFoundDomainError,
    );
  });

  it("trace l'acceptation de la version courante précise", async () => {
    const repository = buildRepository(documents);
    const result = await new AcceptLegalDocumentUseCase(repository).execute("user-1", "TERMS_OF_USE", 2);
    expect(result).toEqual({ version: 2 });
    expect(repository.recordAcceptance).toHaveBeenCalledWith("user-1", "v2");
  });

  it("n'enregistre rien s'il n'y a pas de version publiée", async () => {
    const repository = buildRepository([doc()]);
    await expect(new AcceptLegalDocumentUseCase(repository).execute("user-1", "TERMS_OF_USE", 1)).rejects.toThrow(
      NotFoundDomainError,
    );
    expect(repository.recordAcceptance).not.toHaveBeenCalled();
  });

  it("refuse d'accepter une version qui n'est plus la courante, sans rien enregistrer", async () => {
    const repository = buildRepository(documents);
    await expect(new AcceptLegalDocumentUseCase(repository).execute("user-1", "TERMS_OF_USE", 1)).rejects.toThrow(
      LegalDocumentVersionChangedError,
    );
    expect(repository.recordAcceptance).not.toHaveBeenCalled();
  });
});

describe("ListPendingLegalDocumentsUseCase", () => {
  const terms = doc({ id: "cgu-2", type: "TERMS_OF_USE", version: 2, publishedAt: new Date("2026-02-02") });
  const privacy = doc({ id: "priv-1", type: "PRIVACY_POLICY", version: 1, publishedAt: new Date("2026-01-02") });
  const sales = doc({ id: "cgv-1", type: "TERMS_OF_SALE", version: 1, publishedAt: new Date("2026-01-02") });

  function build(accepted: string[]) {
    const repository = buildRepository([]);
    repository.listByType.mockImplementation(async (type) =>
      [terms, privacy, sales].filter((document) => document.type === type),
    );
    repository.findAcceptedDocumentIds.mockResolvedValue(accepted);
    return new ListPendingLegalDocumentsUseCase(repository);
  }

  it("liste CGU et confidentialité non acceptées, jamais les CGV", async () => {
    const pending = await build([]).execute("user-1");
    expect(pending.map((document) => document.id).sort()).toEqual(["cgu-2", "priv-1"]);
  });

  it("n'inclut pas les documents dont la version courante est déjà acceptée", async () => {
    const pending = await build(["priv-1"]).execute("user-1");
    expect(pending.map((document) => document.id)).toEqual(["cgu-2"]);
  });

  it("est vide quand tout est accepté", async () => {
    expect(await build(["cgu-2", "priv-1"]).execute("user-1")).toEqual([]);
  });
});
