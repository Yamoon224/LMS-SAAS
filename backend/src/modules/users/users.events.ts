/**
 * Événements de domaine publics du module users. Contrairement aux fichiers
 * de domain/application/infrastructure/presentation, ce fichier est une
 * sortie publique au même titre que la façade — les autres modules peuvent
 * s'y abonner (@OnEvent) sans violer les frontières de couches (section
 * 13.2, "communication entre modules... par événements de domaine").
 */

/** ADM-05/ENT-10: consommé par le module notifications pour l'envoi du lien d'activation. */
export class UserInvitedEvent {
  constructor(
    public readonly userId: string,
    public readonly email: string,
    public readonly activationToken: string,
  ) {}
}

export class UserSuspendedEvent {
  /** `actorId` : administrateur plateforme à l'origine de l'action (ADM-06), null pour les routes entreprise. */
  constructor(
    public readonly userId: string,
    public readonly actorId: string | null = null,
  ) {}
}

/** ADM-06 : un compte suspendu a été réactivé. */
export class UserReactivatedEvent {
  constructor(
    public readonly userId: string,
    public readonly actorId: string | null = null,
  ) {}
}

/** ADM-06 : action Admin sur un compte d'entreprise tracée au journal d'audit (jamais de lien ni de secret). */
export class UserAdminActionEvent {
  constructor(
    public readonly userId: string,
    public readonly tenantId: string,
    public readonly actorId: string,
    public readonly action: "invitation-resent" | "password-reset-sent",
  ) {}
}

/** ADM-06 : transfert de propriété d'une entreprise. */
export class TenantOwnershipTransferredEvent {
  constructor(
    public readonly tenantId: string,
    public readonly newOwnerUserId: string,
    public readonly previousOwnerUserIds: readonly string[],
    public readonly actorId: string,
  ) {}
}

export class UserDeactivatedEvent {
  constructor(public readonly userId: string) {}
}

/** PUB-04 : une réinitialisation de mot de passe a été demandée ; consommé par notifications pour l'e-mail. */
export class PasswordResetRequestedEvent {
  constructor(
    public readonly userId: string,
    public readonly resetToken: string,
  ) {}
}

/** Le mot de passe d'un compte vient de changer ; consommé par auth pour fermer toutes les sessions. */
export class PasswordChangedEvent {
  constructor(public readonly userId: string) {}
}
