import { randomInt } from "node:crypto";

/** Alphabet sans caractères ambigus (0/O, 1/I/L) : 10 caractères tirés parmi 31 ≈ 50 bits d'entropie. */
const RECOVERY_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const RECOVERY_CODE_COUNT = 8;
const GROUP_LENGTH = 5;

function randomGroup(): string {
  let group = "";
  for (let i = 0; i < GROUP_LENGTH; i += 1) {
    group += RECOVERY_ALPHABET[randomInt(RECOVERY_ALPHABET.length)];
  }
  return group;
}

/** Codes affichés une seule fois, au format `XXXXX-XXXXX` (CSPRNG). */
export function generateRecoveryCodes(count: number = RECOVERY_CODE_COUNT): string[] {
  const codes = new Set<string>();
  while (codes.size < count) {
    codes.add(`${randomGroup()}-${randomGroup()}`);
  }
  return [...codes];
}

/** Forme canonique (majuscules, sans séparateur) : celle qui est hachée et comparée. */
export function normalizeRecoveryCode(input: string): string {
  return input.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

/** Un code de récupération normalisé fait 10 caractères ; un code TOTP fait 6 chiffres. */
export function looksLikeRecoveryCode(input: string): boolean {
  return normalizeRecoveryCode(input).length === GROUP_LENGTH * 2;
}
