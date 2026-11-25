/**
 * Date de disponibilité d'une vente enregistrée à `soldAt` (ADM-23). Figée à l'enregistrement de la vente, jamais
 * recalculée : un changement du délai de rétention ne s'applique qu'aux ventes futures. Le délai lui-même vient des
 * paramètres financiers de la plateforme (module platform-settings), plus d'une constante.
 */
export function computeAvailableAt(soldAt: Date, retentionDays: number): Date {
  const availableAt = new Date(soldAt);
  availableAt.setDate(availableAt.getDate() + retentionDays);
  return availableAt;
}
