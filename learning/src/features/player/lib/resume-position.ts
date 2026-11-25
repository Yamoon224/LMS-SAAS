/**
 * PUB-16 : reprise de lecture là où l'apprenant s'est arrêté. Fonctions pures + stockage local protégé.
 *
 * Le serveur ne mémorise que le **pourcentage maximum atteint** (suivi de consultation) : c'est une approximation de
 * l'endroit où l'on s'est arrêté, pas une position. La position exacte est donc conservée dans le navigateur et
 * prime ; à défaut (autre appareil, stockage effacé), on reprend au pourcentage atteint.
 */

/** En deçà, reprendre n'a pas de sens (début de la vidéo). */
export const RESUME_MIN_SECONDS = 5;
/** Si l'apprenant est à moins de cette durée de la fin, il avait fini : on repart du début. */
export const RESUME_END_MARGIN_SECONDS = 10;
/** Plafond de la reprise au pourcentage serveur pour une vidéo presque vue (95 à 99 %) : on n'atterrit pas sur la toute fin. */
export const SERVER_PERCENT_CAP = 95;

function isUsableNumber(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

/**
 * Position de reprise en secondes (0 = depuis le début).
 * - position locale si elle existe, sinon pourcentage maximum du serveur appliqué à la durée ;
 * - 0 si la durée est inconnue, si la position est trop proche du début, ou si la vidéo avait été terminée.
 */
export function computeResumeTime(input: {
  localSeconds: number | null;
  serverPercent: number;
  duration: number;
}): number {
  const { localSeconds, serverPercent, duration } = input;
  if (!Number.isFinite(duration) || duration <= 0) return 0;

  // 100 % ou plus : vidéo vue en entier, on repart du début (le plafond ne vaut que pour 95 à 99 %).
  const fromServer =
    serverPercent >= 100 ? 0 : (Math.min(Math.max(serverPercent, 0), SERVER_PERCENT_CAP) / 100) * duration;
  const wanted = isUsableNumber(localSeconds) ? localSeconds : fromServer;

  if (wanted < RESUME_MIN_SECONDS) return 0;
  if (wanted > duration - RESUME_END_MARGIN_SECONDS) return 0;
  return Math.floor(wanted);
}

/** Un navigateur peut signaler le mode « économie de données » : on ne précharge alors que le strict nécessaire. */
export function preloadMode(saveData: boolean): "metadata" | "none" {
  return saveData ? "none" : "metadata";
}

const PREFIX = "learning:playback:";
/** Clé de la forme `<inscription>:<leçon>` : identifiants sans caractère d'espacement ni séparateur de chemin. */
const KEY_FORMAT = /^[A-Za-z0-9_-]{1,64}:[A-Za-z0-9_-]{1,64}$/;

/** Position enregistrée, ou null (absente, corrompue ou stockage indisponible) : jamais d'erreur levée. */
export function readPosition(key: string): number | null {
  if (!KEY_FORMAT.test(key)) return null;
  try {
    const raw = window.localStorage.getItem(`${PREFIX}${key}`);
    if (raw === null) return null;
    const value = Number(raw);
    return isUsableNumber(value) ? value : null;
  } catch {
    return null;
  }
}

export function writePosition(key: string, seconds: number): void {
  if (!KEY_FORMAT.test(key) || !isUsableNumber(seconds)) return;
  try {
    window.localStorage.setItem(`${PREFIX}${key}`, String(Math.floor(seconds)));
  } catch {
    // stockage plein ou bloqué : la reprise retombera sur le pourcentage serveur.
  }
}

/** Vidéo terminée : la prochaine lecture repart du début. */
export function clearPosition(key: string): void {
  if (!KEY_FORMAT.test(key)) return;
  try {
    window.localStorage.removeItem(`${PREFIX}${key}`);
  } catch {
    // sans effet
  }
}
