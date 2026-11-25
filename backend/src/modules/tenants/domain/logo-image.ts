import { DomainError } from "@shared/errors/domain-error";

export class InvalidLogoFileError extends DomainError {
  readonly code = "LOGO_INVALIDE";
}

/** 2 Mo : un logo n'a pas besoin de plus, et le fichier est servi à chaque affichage des sites de l'entreprise. */
export const LOGO_MAX_BYTES = 2 * 1024 * 1024;

export interface DetectedImage {
  extension: "png" | "jpg" | "webp";
  mimeType: string;
}

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/**
 * Type réel de l'image d'après ses premiers octets (jamais d'après le nom ou le type MIME déclaré par le client).
 * SVG volontairement refusé : il peut contenir des scripts.
 */
export function detectImage(content: Buffer): DetectedImage | null {
  if (content.length >= 8 && content.subarray(0, 8).equals(PNG_SIGNATURE)) {
    return { extension: "png", mimeType: "image/png" };
  }
  if (content.length >= 3 && content[0] === 0xff && content[1] === 0xd8 && content[2] === 0xff) {
    return { extension: "jpg", mimeType: "image/jpeg" };
  }
  if (content.length >= 12 && content.subarray(0, 4).toString("ascii") === "RIFF" && content.subarray(8, 12).toString("ascii") === "WEBP") {
    return { extension: "webp", mimeType: "image/webp" };
  }
  return null;
}
