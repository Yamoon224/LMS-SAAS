/** Événements publics du module platform-settings (consommés par le journal d'audit, RG-19). */

/**
 * Un paramètre financier a été modifié (ADM-21, ADM-23). Porte le champ et l'ancienne/nouvelle valeur (nombre ou code
 * d'énumération) : ce ne sont jamais des secrets.
 */
export class FinanceSettingChangedEvent {
  constructor(
    public readonly field: string,
    public readonly previousValue: number | string,
    public readonly newValue: number | string,
    public readonly actorUserId: string | null,
  ) {}
}
