import { Inject, Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { NotFoundDomainError } from "@shared/errors";
import * as argon2 from "argon2";

import {
  AccountAlreadyDeletedError,
  AccountDeletionBlockedError,
  WrongPasswordError,
} from "../domain/privacy.errors";
import { PRIVACY_REPOSITORY } from "../domain/privacy.repository.port";
import type { PrivacyRepositoryPort } from "../domain/privacy.repository.port";
import { LearnerAccountDeletedEvent } from "../privacy.events";

/**
 * Droit à l'effacement (loi 2013-450, section 11) : anonymisation irréversible du compte apprenant, après
 * confirmation par mot de passe. Conservés car exigés par la loi comptable ou l'intégrité : paiements, grand livre,
 * inscriptions et résultats (désormais sans identité), certificats délivrés (numéro et validité ; nom du titulaire
 * remplacé par « Compte supprimé »), acceptations légales (preuve de consentement, sans identité).
 */
@Injectable()
export class DeleteMyAccountUseCase {
  constructor(
    @Inject(PRIVACY_REPOSITORY) private readonly repository: PrivacyRepositoryPort,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(userId: string, password: string, now: Date = new Date()): Promise<void> {
    const account = await this.repository.findAccount(userId);
    if (!account || account.type !== "LEARNER") throw new NotFoundDomainError("Compte introuvable.");
    // Le jeton d'accès reste valable quelques minutes après une suppression : une 2e demande est refusée.
    if (account.anonymizedAt) throw new AccountAlreadyDeletedError("Ce compte a déjà été supprimé.");

    if (!account.passwordHash || !(await argon2.verify(account.passwordHash, password))) {
      throw new WrongPasswordError("Mot de passe incorrect.");
    }

    const blockers = await this.repository.findDeletionBlockers(userId);
    if (blockers.pendingPayments > 0 || blockers.openRefunds > 0) {
      throw new AccountDeletionBlockedError(
        "Suppression impossible pour le moment : un paiement ou une demande de remboursement est en cours. " +
          "Réessayez une fois celui-ci traité.",
      );
    }

    const done = await this.repository.anonymizeLearner(userId, now);
    if (!done) throw new AccountAlreadyDeletedError("Ce compte a déjà été supprimé.");

    this.eventEmitter.emit("privacy.account-deleted", new LearnerAccountDeletedEvent(userId, account.tenantId, "SELF"));
  }
}
