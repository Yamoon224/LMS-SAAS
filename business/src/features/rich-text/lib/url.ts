/**
 * Adresse web autorisée dans le contenu riche (ENT-23) : https UNIQUEMENT (ni http, ni javascript:, data:, mailto:...),
 * sans espace ni caractère de contrôle, 2048 caractères au plus. Retourne l'URL normalisée, ou null si elle est refusée.
 */
export function normalizeHttpsUrl(raw: string): string | null {
  const value = raw.trim();
  // eslint-disable-next-line no-control-regex
  if (value.length === 0 || value.length > 2048 || /[\s\u0000-\u001F\u007F<>"']/.test(value)) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.hostname.length === 0) return null;
    return url.toString();
  } catch {
    return null;
  }
}
