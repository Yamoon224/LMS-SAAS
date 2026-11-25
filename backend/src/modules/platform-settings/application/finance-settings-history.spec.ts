import { InvalidFinanceSettingError, validateFinanceSetting } from "../domain/finance-settings";

import { ListFinanceSettingsHistoryUseCase } from "./finance-settings.use-cases";

describe("ListFinanceSettingsHistoryUseCase", () => {
  const setup = () => {
    const entries = [{ key: "RETENTION_DAYS", value: "7", effectiveFrom: new Date(), changedByUserId: null }];
    const repository = { listHistory: jest.fn().mockResolvedValue(entries) };
    return { entries, repository, useCase: new ListFinanceSettingsHistoryUseCase(repository as never) };
  };

  it("utilise 50 entrées par défaut et renvoie le résultat du dépôt", async () => {
    const { useCase, repository, entries } = setup();
    await expect(useCase.execute()).resolves.toBe(entries);
    expect(repository.listHistory).toHaveBeenCalledWith(50);
  });

  it.each([
    [0, 1],
    [-5, 1],
    [30, 30],
    [500, 200],
  ])("borne la limite %p à %p", async (asked, used) => {
    const { useCase, repository } = setup();
    await useCase.execute(asked);
    expect(repository.listHistory).toHaveBeenCalledWith(used);
  });
});

describe("validateFinanceSetting - champ inconnu", () => {
  it("refuse un champ qui n'existe pas", () => {
    expect(() => validateFinanceSetting("inconnu" as never, 1)).toThrow(InvalidFinanceSettingError);
  });
});
