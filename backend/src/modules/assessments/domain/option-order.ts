/** Générateur pseudo-aléatoire déterministe (mulberry32) alimenté par une graine texte. */
function seededRandom(seed: string): () => number {
  let hash = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    hash = Math.imul(hash ^ seed.charCodeAt(i), 3432918353);
    hash = (hash << 13) | (hash >>> 19);
  }
  let state = hash >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Ordre d'affichage des réponses possibles d'une question pour UNE tentative : ordre configuré
 * (`order`) ou, si `shuffleAnswers` est actif, mélange déterministe (graine = tentative + question)
 * pour que l'ordre reste identique à chaque rechargement de la même tentative.
 */
export function orderOptionsForAttempt<T extends { order: number }>(
  options: readonly T[],
  shuffleAnswers: boolean,
  seed: string,
): T[] {
  const sorted = [...options].sort((a, b) => a.order - b.order);
  if (!shuffleAnswers) return sorted;

  const random = seededRandom(seed);
  for (let i = sorted.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [sorted[i], sorted[j]] = [sorted[j] as T, sorted[i] as T];
  }
  return sorted;
}
