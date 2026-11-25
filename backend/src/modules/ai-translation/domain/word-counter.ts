/**
 * ADM-18: le coût est calculé au prorata du nombre de mots du contenu
 * source. Fonction pure (section 13.1) : dépouille le HTML de ses balises
 * avant de compter, pour ne pas facturer le balisage lui-même.
 */
export function countWords(html: string): number {
  const text = html
    .replace(/<[^>]*>/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .trim();

  if (text.length === 0) return 0;
  return text.split(/\s+/).length;
}
