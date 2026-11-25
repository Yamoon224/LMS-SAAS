import type { LanguagesFacade } from "@modules/languages/languages.facade";

import { UpdateOwnProfileUseCase } from "./update-own-profile.use-case";
import type { UpdateUserProfileUseCase } from "./update-user-profile.use-case";

function build(assertEnabled: jest.Mock = jest.fn().mockResolvedValue(undefined)) {
  const update = { execute: jest.fn().mockResolvedValue(undefined) } as unknown as jest.Mocked<UpdateUserProfileUseCase>;
  const languages = { assertEnabled } as unknown as LanguagesFacade;
  return { useCase: new UpdateOwnProfileUseCase(update, languages), update, assertEnabled };
}

describe("UpdateOwnProfileUseCase", () => {
  it("vérifie la langue préférée puis met le profil à jour", async () => {
    const { useCase, update, assertEnabled } = build();
    await useCase.execute("user-1", { firstName: "Awa", locale: "en" });
    expect(assertEnabled).toHaveBeenCalledWith("en");
    expect(update.execute).toHaveBeenCalledWith("user-1", { firstName: "Awa", locale: "en" });
  });

  it("n'écrit rien si la langue est désactivée", async () => {
    const { useCase, update } = build(jest.fn().mockRejectedValue(new Error("LANGUE_NON_ACTIVEE")));
    await expect(useCase.execute("user-1", { firstName: "Awa", locale: "ar" })).rejects.toThrow("LANGUE_NON_ACTIVEE");
    expect(update.execute).not.toHaveBeenCalled();
  });

  it("ne contrôle aucune langue quand elle n'est pas modifiée", async () => {
    const { useCase, update, assertEnabled } = build();
    await useCase.execute("user-1", { lastName: "Kone" });
    expect(assertEnabled).not.toHaveBeenCalled();
    expect(update.execute).toHaveBeenCalled();
  });
});
