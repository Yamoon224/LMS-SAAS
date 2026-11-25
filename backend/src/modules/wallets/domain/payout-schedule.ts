/** Fréquence du reversement automatique (ADM-23) ; valeurs identiques à celles des paramètres financiers. */
export type AutomaticPayoutFrequency = "MANUAL" | "WEEKLY" | "MONTHLY";

/**
 * La tâche planifiée s'exécute chaque jour ; ce prédicat décide si ce jour-là une vague de demandes doit être générée.
 * WEEKLY = le lundi, MONTHLY = le 1er du mois (UTC, pour un comportement identique quel que soit le fuseau du serveur),
 * MANUAL = jamais (aucune demande générée par le système).
 */
export function isAutomaticPayoutDay(frequency: AutomaticPayoutFrequency, date: Date): boolean {
  switch (frequency) {
    case "WEEKLY":
      return date.getUTCDay() === 1;
    case "MONTHLY":
      return date.getUTCDate() === 1;
    default:
      return false;
  }
}
