/**
 * Événements publics du module auth (consommés par le journal d'audit, RG-19). Ne portent JAMAIS de secret, de
 * code ni de jeton : seulement les identifiants des comptes concernés.
 */

export class TwoFactorEnabledEvent {
  constructor(
    public readonly userId: string,
    public readonly tenantId: string | null,
  ) {}
}

export class TwoFactorDisabledEvent {
  constructor(
    public readonly userId: string,
    public readonly tenantId: string | null,
  ) {}
}

/** Un administrateur a réinitialisé la 2FA d'un autre compte (perte de l'appareil). */
export class TwoFactorResetEvent {
  constructor(
    public readonly targetUserId: string,
    public readonly tenantId: string | null,
    public readonly actorId: string,
  ) {}
}

/** Un code de récupération a servi à se connecter : événement de sécurité à tracer. */
export class TwoFactorRecoveryCodeUsedEvent {
  constructor(
    public readonly userId: string,
    public readonly tenantId: string | null,
  ) {}
}
