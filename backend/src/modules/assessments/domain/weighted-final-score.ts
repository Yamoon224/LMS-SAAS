/**
 * ENT-34 : note finale pondérée d'une formation. Fonction pure : chaque évaluation (quiz de module, examen final)
 * apporte sa meilleure note (0-100) et son poids (entier >= 0, défaut 1). Une évaluation sans note (pas encore passée)
 * est ignorée ; un poids de 0 exclut l'évaluation. Retourne null si aucune évaluation ne pèse dans le calcul.
 */
export interface WeightedScoreItem {
  scorePercent: number | null;
  weight: number;
}

export function computeWeightedFinalScore(items: readonly WeightedScoreItem[]): number | null {
  let totalWeight = 0;
  let weighted = 0;
  for (const item of items) {
    if (!Number.isFinite(item.weight) || item.weight < 0) {
      throw new RangeError(`Poids d'évaluation invalide: ${item.weight}.`);
    }
    if (item.scorePercent === null || item.weight === 0) continue;
    totalWeight += item.weight;
    weighted += item.scorePercent * item.weight;
  }
  if (totalWeight === 0) return null;
  return Math.round(weighted / totalWeight);
}
