import { LanguageNotEnabledError, LanguageUnknownError } from "../domain/language";

import { AssertLanguageEnabledUseCase, FilterEnabledLanguagesUseCase } from "./languages.use-cases";

const repository = (disabled: string[]) => ({
  listDisabledCodes: jest.fn().mockResolvedValue(disabled),
  setEnabled: jest.fn(),
});

describe("FilterEnabledLanguagesUseCase", () => {
  it("ne garde que les codes connus et activés, en conservant l'ordre demandé", async () => {
    const useCase = new FilterEnabledLanguagesUseCase(repository(["ar"]));
    await expect(useCase.execute(["es", "ar", "xx", "fr"])).resolves.toEqual(["es", "fr"]);
  });

  it("renvoie une liste vide pour une entrée vide", async () => {
    await expect(new FilterEnabledLanguagesUseCase(repository([])).execute([])).resolves.toEqual([]);
  });
});

describe("AssertLanguageEnabledUseCase", () => {
  it("accepte une langue activée", async () => {
    await expect(new AssertLanguageEnabledUseCase(repository([])).execute("en")).resolves.toBeUndefined();
  });

  it("refuse une langue désactivée ou inconnue", async () => {
    const useCase = new AssertLanguageEnabledUseCase(repository(["ar"]));
    await expect(useCase.execute("ar")).rejects.toBeInstanceOf(LanguageNotEnabledError);
    await expect(useCase.execute("xx")).rejects.toBeInstanceOf(LanguageUnknownError);
  });
});
