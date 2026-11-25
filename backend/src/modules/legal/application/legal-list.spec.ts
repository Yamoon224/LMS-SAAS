import { ListLegalDocumentsUseCase } from "./legal.use-cases";

describe("ListLegalDocumentsUseCase", () => {
  it("renvoie toutes les versions avec leur nombre d'acceptations, telles que fournies par le dépôt", async () => {
    const all = [
      {
        id: "d1",
        type: "TERMS_OF_USE" as const,
        version: 1,
        title: "CGU",
        content: "x",
        publishedAt: null,
        createdAt: new Date("2026-01-01"),
        acceptancesCount: 3,
      },
    ];
    const repository = { listAll: jest.fn().mockResolvedValue(all) };
    await expect(new ListLegalDocumentsUseCase(repository as never).execute()).resolves.toBe(all);
    expect(repository.listAll).toHaveBeenCalledTimes(1);
  });
});
