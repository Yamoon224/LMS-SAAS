import {
  LanguageNotDisableableError,
  LanguageNotEnabledError,
  LanguageUnknownError,
} from "../domain/language";
import type { LanguageRepositoryPort } from "../domain/language.repository.port";

import {
  AssertLanguageEnabledUseCase,
  ListEnabledLanguagesUseCase,
  ListLanguagesUseCase,
  SetLanguageEnabledUseCase,
} from "./languages.use-cases";

function buildRepository(disabled: string[] = []): jest.Mocked<LanguageRepositoryPort> {
  return {
    listDisabledCodes: jest.fn().mockResolvedValue(disabled),
    setEnabled: jest.fn().mockResolvedValue(undefined),
  };
}

describe("ListLanguagesUseCase / ListEnabledLanguagesUseCase", () => {
  it("l'Admin voit les huit langues avec leur état, le français verrouillé", async () => {
    const languages = await new ListLanguagesUseCase(buildRepository(["ar"])).execute();
    expect(languages).toHaveLength(8);
    expect(languages.find((language) => language.code === "ar")?.enabled).toBe(false);
    expect(languages.find((language) => language.code === "fr")).toMatchObject({ enabled: true, locked: true });
  });

  it("le public ne voit que les langues activées, sans détail d'administration", async () => {
    const languages = await new ListEnabledLanguagesUseCase(buildRepository(["ar", "tr"])).execute();
    expect(languages.map((language) => language.code)).toEqual(["fr", "en", "es", "de", "zh", "ru"]);
    expect(Object.keys(languages[0] ?? {}).sort()).toEqual(["code", "nativeName", "rtl"]);
  });
});

describe("SetLanguageEnabledUseCase", () => {
  it("désactive puis réactive une langue", async () => {
    const repository = buildRepository();
    const useCase = new SetLanguageEnabledUseCase(repository);
    await useCase.execute("es", false);
    await useCase.execute("es", true);
    expect(repository.setEnabled.mock.calls).toEqual([
      ["es", false],
      ["es", true],
    ]);
  });

  it("refuse de désactiver le français sans rien enregistrer", async () => {
    const repository = buildRepository();
    await expect(new SetLanguageEnabledUseCase(repository).execute("fr", false)).rejects.toThrow(
      LanguageNotDisableableError,
    );
    expect(repository.setEnabled).not.toHaveBeenCalled();
  });

  it("refuse un code inconnu sans rien enregistrer", async () => {
    const repository = buildRepository();
    await expect(new SetLanguageEnabledUseCase(repository).execute("xx", true)).rejects.toThrow(LanguageUnknownError);
    expect(repository.setEnabled).not.toHaveBeenCalled();
  });
});

describe("AssertLanguageEnabledUseCase", () => {
  it("accepte une langue activée", async () => {
    await expect(new AssertLanguageEnabledUseCase(buildRepository()).execute("de")).resolves.toBeUndefined();
  });

  it("refuse une langue désactivée ou inconnue", async () => {
    const useCase = new AssertLanguageEnabledUseCase(buildRepository(["de"]));
    await expect(useCase.execute("de")).rejects.toThrow(LanguageNotEnabledError);
    await expect(useCase.execute("klingon")).rejects.toThrow(LanguageUnknownError);
  });
});
