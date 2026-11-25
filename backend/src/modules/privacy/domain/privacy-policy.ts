/**
 * Politique de conservation des données personnelles (section 11, loi ivoirienne 2013-450). Durées fixées ici,
 * documentées dans docs/registre-des-traitements.md : les modifier suppose de mettre le registre à jour.
 */

/** Notifications lues : purgées au-delà de ce délai. */
export const READ_NOTIFICATION_RETENTION_MONTHS = 12;

/** Compte apprenant sans aucune activité : anonymisé au-delà de ce délai. */
export const INACTIVE_LEARNER_RETENTION_MONTHS = 36;

/** Nombre maximal de comptes traités par exécution de la tâche planifiée (évite une rafale de transactions). */
export const INACTIVE_ACCOUNTS_BATCH_SIZE = 100;

/** Variable d'environnement : `RETENTION_PURGE_ENABLED=false` désactive la purge automatique (actif par défaut). */
export function isRetentionPurgeEnabled(env: Record<string, string | undefined>): boolean {
  return env.RETENTION_PURGE_ENABLED !== "false";
}

/** Date située `months` mois avant `now` (UTC ; le jour est ramené au dernier jour du mois si besoin). */
export function monthsBefore(now: Date, months: number): Date {
  const result = new Date(now.getTime());
  const day = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() - months);
  const lastDay = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate();
  result.setUTCDate(Math.min(day, lastDay));
  return result;
}
