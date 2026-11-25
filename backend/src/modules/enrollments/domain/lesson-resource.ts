/**
 * Interprétation de `Lesson.storageUrl` pour le lecteur apprenant :
 *  - un UUID est l'identifiant d'un MediaAsset du tenant (lecture via URL signée à durée limitée) ;
 *  - une URL http(s) est une ressource externe renvoyée telle quelle ;
 *  - toute autre valeur (clé S3 brute, schéma exotique...) n'est JAMAIS relayée au client.
 */
export type LessonResource =
  | { kind: "NONE" }
  | { kind: "MEDIA"; mediaAssetId: string }
  | { kind: "EXTERNAL"; url: string };

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HTTP_URL_REGEX = /^https?:\/\/\S+$/i;

export function resolveLessonResource(
  storageUrl: string | null,
  resourceType: string,
  downloadAllowed: boolean,
): LessonResource {
  const value = storageUrl?.trim();
  if (!value || resourceType === "TEXT") return { kind: "NONE" };

  // Un DOCUMENT (Word, Excel...) ne se consulte qu'en le téléchargeant : sans autorisation, aucun accès.
  if (resourceType === "DOCUMENT" && !downloadAllowed) return { kind: "NONE" };

  if (UUID_REGEX.test(value)) return { kind: "MEDIA", mediaAssetId: value };
  if (HTTP_URL_REGEX.test(value)) return { kind: "EXTERNAL", url: value };
  return { kind: "NONE" };
}
