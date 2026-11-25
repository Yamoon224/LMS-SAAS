import { Inject, Injectable, Logger } from "@nestjs/common";

import { Email } from "../domain/email.vo";
import { UserStatus } from "../domain/user-status";
import { USER_REPOSITORY } from "../domain/user.repository.port";
import type { UserRepositoryPort } from "../domain/user.repository.port";

import { InviteLearnerUseCase } from "./invite-learner.use-case";
import type { InviteLearnerInput } from "./invite-learner.use-case";
import { EmailAlreadyUsedError } from "./invite-user.use-case";
import { ResendInvitationUseCase } from "./resend-invitation.use-case";

/**
 * Auto-inscription apprenant sur la surface « learning » d'un tenant. La réponse est volontairement
 * identique que l'e-mail soit nouveau ou déjà connu (pas d'énumération de comptes) :
 *  - e-mail inconnu         -> compte LEARNER INVITED + lien d'activation envoyé ;
 *  - compte LEARNER INVITED -> le lien d'activation est renvoyé (l'ancien est révoqué) ;
 *  - tout autre cas (actif, suspendu, utilisateur interne...) -> aucune action, aucun signal.
 * L'e-mail est vérifié avant tout accès : le mot de passe n'est défini qu'à l'activation.
 */
@Injectable()
export class RegisterLearnerUseCase {
  private readonly logger = new Logger(RegisterLearnerUseCase.name);

  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepositoryPort,
    private readonly inviteLearnerUseCase: InviteLearnerUseCase,
    private readonly resendInvitationUseCase: ResendInvitationUseCase,
  ) {}

  async execute(input: InviteLearnerInput): Promise<void> {
    const normalizedEmail = Email.create(input.email).toString();
    const existing = await this.userRepository.findByEmailInTenant(input.tenantId, normalizedEmail);

    if (existing) {
      if (existing.type === "LEARNER" && existing.status === UserStatus.INVITED) {
        await this.resendInvitationUseCase.execute(existing.id, input.tenantId);
      }
      return;
    }

    try {
      await this.inviteLearnerUseCase.execute({ ...input, email: normalizedEmail });
    } catch (error) {
      // Deux inscriptions simultanées avec le même e-mail : la seconde est silencieusement absorbée.
      if (error instanceof EmailAlreadyUsedError || isUniqueViolation(error)) {
        this.logger.debug("Inscription apprenant concurrente absorbée.");
        return;
      }
      throw error;
    }
  }
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: unknown }).code === "P2002";
}
