import type { CommissionRuleRepositoryPort } from "../domain/commission-rule.repository.port";

import { InvalidCommissionRuleError, SetCommissionRuleUseCase } from "./set-commission-rule.use-case";

function buildRepositoryMock(): CommissionRuleRepositoryPort {
  return {
    create: jest.fn().mockResolvedValue({}),
    supersede: jest.fn(),
    resolveApplicableRule: jest.fn(),
    listAll: jest.fn().mockResolvedValue([]),
  };
}

describe("SetCommissionRuleUseCase", () => {
  it("creates a GLOBAL rule with only a percent rate", async () => {
    const repository = buildRepositoryMock();
    const useCase = new SetCommissionRuleUseCase(repository);

    await useCase.execute({ scope: "GLOBAL", type: "ONLINE", percentRate: 10 });

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ scope: "GLOBAL", percentRate: 10 }),
    );
  });

  it("rejects a rule with neither a percent rate nor a fixed amount", async () => {
    const useCase = new SetCommissionRuleUseCase(buildRepositoryMock());

    await expect(useCase.execute({ scope: "GLOBAL", type: "ONLINE" })).rejects.toThrow(
      InvalidCommissionRuleError,
    );
  });

  it("rejects a TENANT rule without a tenantId", async () => {
    const useCase = new SetCommissionRuleUseCase(buildRepositoryMock());

    await expect(
      useCase.execute({ scope: "TENANT", type: "ONLINE", percentRate: 5 }),
    ).rejects.toThrow(InvalidCommissionRuleError);
  });

  it("rejects a COURSE rule without a courseId", async () => {
    const useCase = new SetCommissionRuleUseCase(buildRepositoryMock());

    await expect(
      useCase.execute({ scope: "COURSE", type: "ONLINE", tenantId: "tenant-1", percentRate: 5 }),
    ).rejects.toThrow(InvalidCommissionRuleError);
  });

  it("rejects a PLAN rule without a planId", async () => {
    const useCase = new SetCommissionRuleUseCase(buildRepositoryMock());

    await expect(
      useCase.execute({ scope: "PLAN", type: "ONLINE", percentRate: 5 }),
    ).rejects.toThrow(InvalidCommissionRuleError);
  });

  it("accepts a COURSE rule with both tenantId and courseId", async () => {
    const repository = buildRepositoryMock();
    const useCase = new SetCommissionRuleUseCase(repository);

    await useCase.execute({
      scope: "COURSE",
      type: "OFFLINE",
      tenantId: "tenant-1",
      courseId: "course-1",
      fixedAmount: 500,
    });

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ courseId: "course-1", fixedAmount: 500 }),
    );
  });

  it("lists all rules through the repository", async () => {
    const rules = [{ id: "r1" }] as never;
    const repository = buildRepositoryMock();
    (repository.listAll as jest.Mock).mockResolvedValue(rules);

    await expect(new SetCommissionRuleUseCase(repository).listAll()).resolves.toBe(rules);
  });

  describe("revise", () => {
    it("remplace la règle par une nouvelle version avec les nouveaux taux", async () => {
      const repository = buildRepositoryMock();
      (repository.supersede as jest.Mock).mockResolvedValue({ id: "new" });
      const useCase = new SetCommissionRuleUseCase(repository);

      await useCase.revise("old", { percentRate: 15 });

      expect(repository.supersede).toHaveBeenCalledWith("old", { percentRate: 15, fixedAmount: null });
    });

    it("refuse une règle sans aucun taux", async () => {
      const repository = buildRepositoryMock();
      const useCase = new SetCommissionRuleUseCase(repository);

      await expect(useCase.revise("old", { percentRate: null, fixedAmount: null })).rejects.toThrow(InvalidCommissionRuleError);
      expect(repository.supersede).not.toHaveBeenCalled();
    });

    it("signale une règle introuvable ou déjà remplacée", async () => {
      const repository = buildRepositoryMock();
      (repository.supersede as jest.Mock).mockResolvedValue(null);
      const useCase = new SetCommissionRuleUseCase(repository);

      await expect(useCase.revise("gone", { percentRate: 5 })).rejects.toThrow("introuvable");
    });
  });
});
