import { PasswordChangedEvent } from "@modules/users/users.events";
import { Inject, Injectable } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";

import { AUTH_REPOSITORY } from "../domain/auth.repository.port";
import type { AuthRepositoryPort } from "../domain/auth.repository.port";

/**
 * Après un changement de mot de passe, toutes les sessions ouvertes sont fermées : une personne qui aurait
 * obtenu l'ancien mot de passe (motif fréquent d'une réinitialisation) perd son accès. Les jetons d'accès déjà
 * émis expirent d'eux-mêmes (15 minutes) ; ce sont les jetons de rafraîchissement qui sont révoqués.
 */
@Injectable()
export class RevokeSessionsOnPasswordChangeListener {
  constructor(@Inject(AUTH_REPOSITORY) private readonly authRepository: AuthRepositoryPort) {}

  @OnEvent("user.password-changed")
  async handle(event: PasswordChangedEvent): Promise<void> {
    await this.authRepository.revokeAllRefreshTokens(event.userId);
  }
}
