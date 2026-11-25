import * as dns from "node:dns";
import * as http from "node:http";
import * as https from "node:https";
import * as net from "node:net";

/** Taille maximale d'une image distante et délai maximal de téléchargement. */
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
export const IMAGE_TIMEOUT_MS = 4000;

/** Vrai si l'adresse IP est publique (ni locale, ni privée, ni réservée) : garde-fou contre les requêtes vers le réseau interne (SSRF). */
export function isPublicAddress(address: string): boolean {
  const version = net.isIP(address);
  if (version === 4) {
    const [a, b = 0] = address.split(".").map(Number) as [number, number?];
    if (a === 0 || a === 10 || a === 127 || a >= 224) return false;
    if (a === 169 && b === 254) return false;
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 192 && b === 168) return false;
    if (a === 100 && b >= 64 && b <= 127) return false;
    if (a === 192 && b === 0) return false;
    if (a === 198 && (b === 18 || b === 19)) return false;
    return true;
  }
  if (version === 6) {
    const lower = address.toLowerCase();
    const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(lower);
    if (mapped) return isPublicAddress(mapped[1] as string);
    if (lower === "::" || lower === "::1") return false;
    if (/^f[cd]/.test(lower) || /^fe[89ab]/.test(lower) || lower.startsWith("ff")) return false;
    return true;
  }
  return false;
}

/** PNG ou JPEG uniquement (formats gérés par le moteur PDF), détectés par leur signature et non par le type annoncé. */
export function isSupportedImage(buffer: Buffer): boolean {
  const png = buffer.length > 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const jpeg = buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  return png || jpeg;
}

/**
 * Télécharge une image distante pour le certificat. Renvoie `null` (l'élément est simplement omis) pour toute
 * anomalie : URL non http(s), hôte résolu vers une adresse non publique, redirection, délai ou taille dépassés,
 * format non PNG/JPEG. L'adresse validée est celle réellement contactée (pas de nouvelle résolution DNS).
 */
export async function fetchImageSafely(rawUrl: string): Promise<Buffer | null> {
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    const hostname = url.hostname.replace(/^\[|\]$/g, "");
    const addresses = net.isIP(hostname)
      ? [{ address: hostname, family: net.isIP(hostname) }]
      : await dns.promises.lookup(hostname, { all: true });
    if (addresses.length === 0 || !addresses.every((entry) => isPublicAddress(entry.address))) return null;
    const pinned = addresses[0] as { address: string; family: number };

    return await new Promise<Buffer | null>((resolve) => {
      const client = url.protocol === "https:" ? https : http;
      const request = client.get(
        url,
        {
          timeout: IMAGE_TIMEOUT_MS,
          headers: { Accept: "image/png,image/jpeg" },
          lookup: ((_host: string, options: { all?: boolean }, callback: (...args: unknown[]) => void) => {
            if (options?.all) callback(null, [{ address: pinned.address, family: pinned.family }]);
            else callback(null, pinned.address, pinned.family);
          }) as never,
        },
        (response) => {
          if (response.statusCode !== 200) {
            response.resume();
            resolve(null);
            return;
          }
          const chunks: Buffer[] = [];
          let size = 0;
          response.on("data", (chunk: Buffer) => {
            size += chunk.length;
            if (size > MAX_IMAGE_BYTES) {
              request.destroy();
              resolve(null);
              return;
            }
            chunks.push(chunk);
          });
          response.on("end", () => {
            const buffer = Buffer.concat(chunks);
            resolve(isSupportedImage(buffer) ? buffer : null);
          });
          response.on("error", () => resolve(null));
        },
      );
      request.on("timeout", () => {
        request.destroy();
        resolve(null);
      });
      request.on("error", () => resolve(null));
    });
  } catch {
    return null;
  }
}
