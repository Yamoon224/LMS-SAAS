/**
 * PUB-17 : préférence de langue de lecture, par inscription, conservée dans le navigateur.
 *
 * Magasin externe minimal (compatible `useSyncExternalStore`) : tous les composants du lecteur — sommaire, leçon,
 * redirection de reprise — lisent la même valeur et se mettent à jour ensemble quand elle change. Chaque accès au
 * stockage est protégé : navigation privée ou stockage bloqué ne doivent jamais casser la lecture (on reste alors
 * dans la langue d'origine, ou on garde le choix en mémoire pour la session).
 *
 * La progression n'en dépend pas : elle est rattachée à la leçon, pas à la langue (PUB-17).
 */

const PREFIX = "learning:content-locale:";
const FORMAT = /^[a-z]{2}(-[A-Za-z]{2})?$/;

const memory = new Map<string, string>();
const listeners = new Set<() => void>();

function storageKey(enrollmentId: string): string {
  return `${PREFIX}${enrollmentId}`;
}

/** Une valeur lue dans le stockage n'est jamais de confiance : seule une forme de code de langue est acceptée. */
function sanitize(value: string | null): string {
  return value !== null && FORMAT.test(value) ? value : "";
}

export function getContentLocale(enrollmentId: string): string {
  const inMemory = memory.get(enrollmentId);
  if (inMemory !== undefined) return inMemory;
  try {
    return sanitize(window.localStorage.getItem(storageKey(enrollmentId)));
  } catch {
    return "";
  }
}

/** `""` = langue d'origine. */
export function setContentLocale(enrollmentId: string, locale: string): void {
  const next = sanitize(locale);
  memory.set(enrollmentId, next);
  try {
    if (next) window.localStorage.setItem(storageKey(enrollmentId), next);
    else window.localStorage.removeItem(storageKey(enrollmentId));
  } catch {
    // stockage indisponible : le choix reste valable pour la session via la mémoire.
  }
  listeners.forEach((listener) => listener());
}

export function subscribeContentLocale(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Réservé aux tests : remet le magasin à zéro. */
export function resetContentLocaleStore(): void {
  memory.clear();
  listeners.clear();
}
