import { LanguagesFacade } from "@modules/languages/languages.facade";
import { Injectable } from "@nestjs/common";

import type { UpdateUserProfileData } from "../domain/user.repository.port";

import { UpdateUserProfileUseCase } from "./update-user-profile.use-case";

/**
 * PUB-04 : l'utilisateur modifie son propre profil. La langue préférée doit être une langue activée sur la
 * plateforme (ADM-40) ; les autres champs sont validés par le DTO.
 */
@Injectable()
export class UpdateOwnProfileUseCase {
  constructor(
    private readonly updateUserProfileUseCase: UpdateUserProfileUseCase,
    private readonly languagesFacade: LanguagesFacade,
  ) {}

  async execute(userId: string, data: UpdateUserProfileData): Promise<void> {
    if (data.locale !== undefined) {
      await this.languagesFacade.assertEnabled(data.locale);
    }
    await this.updateUserProfileUseCase.execute(userId, data);
  }
}
