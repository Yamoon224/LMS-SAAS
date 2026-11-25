/** Nombre maximal de cartes sur une ligne (écran large). */
const MAX_PER_ROW = 3;

/**
 * Répartit `count` cartes en lignes équilibrées de 1 à 3 cartes (5 → 3 + 2, 4 → 2 + 2, 7 → 3 + 2 + 2) :
 * aucune ligne ne reste incomplète, chaque carte s'étire pour couvrir toute la largeur.
 */
export function balancedRows(count: number): number[] {
  if (count <= 0) return [];
  const rows = Math.ceil(count / MAX_PER_ROW);
  const base = Math.floor(count / rows);
  const extra = count % rows;
  return Array.from({ length: rows }, (_, index) => base + (index < extra ? 1 : 0));
}

/** Classes d'emprise sur une grille de 6 colonnes (écran large), de 2 colonnes (écran moyen), de 1 sur mobile. */
const LARGE_SPAN: Record<number, string> = { 1: "lg:col-span-6", 2: "lg:col-span-3", 3: "lg:col-span-2" };

/** Classe de colonnes de chaque carte : une grille `grid-cols-1 sm:grid-cols-2 lg:grid-cols-6` sans trou. */
export function cardSpans(count: number): string[] {
  const spans: string[] = [];
  for (const rowSize of balancedRows(count)) {
    for (let index = 0; index < rowSize; index++) spans.push(LARGE_SPAN[rowSize] ?? "lg:col-span-2");
  }
  // Écran moyen (2 colonnes) : une dernière carte seule occupe toute la ligne.
  if (count % 2 === 1 && spans.length > 0) spans[spans.length - 1] += " sm:col-span-2";
  return spans;
}
