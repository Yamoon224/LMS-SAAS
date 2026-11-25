import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

import { base32Encode } from "./base32";

/**
 * TOTP (RFC 6238) sur HOTP (RFC 4226) : HMAC-SHA1, 6 chiffres, pas de 30 s.
 * Implémenté avec `node:crypto` uniquement (aucune dépendance) ; vérifié avec les vecteurs officiels de la RFC.
 */
export const TOTP_DIGITS = 6;
export const TOTP_PERIOD_SECONDS = 30;
/** Dérive d'horloge tolérée : le pas courant, le précédent et le suivant — pas davantage. */
export const TOTP_WINDOW = 1;
/** 160 bits, la taille recommandée par la RFC 4226 pour une clé HMAC-SHA1. */
export const TOTP_SECRET_BYTES = 20;

export function generateTotpSecret(): Buffer {
  return randomBytes(TOTP_SECRET_BYTES);
}

export function totpStepAt(nowMs: number, periodSeconds: number = TOTP_PERIOD_SECONDS): number {
  return Math.floor(nowMs / 1000 / periodSeconds);
}

/** HOTP(K, C) tronqué dynamiquement (RFC 4226 section 5.3), rendu sur `digits` chiffres avec zéros en tête. */
export function hotp(secret: Buffer, counter: number, digits: number = TOTP_DIGITS): string {
  const message = Buffer.alloc(8);
  message.writeBigUInt64BE(BigInt(counter));
  const hmac = createHmac("sha1", secret).update(message).digest();
  const byteAt = (index: number): number => hmac.readUInt8(index);
  const offset = byteAt(hmac.length - 1) & 0x0f;
  const binary =
    ((byteAt(offset) & 0x7f) << 24) |
    (byteAt(offset + 1) << 16) |
    (byteAt(offset + 2) << 8) |
    byteAt(offset + 3);
  return (binary % 10 ** digits).toString().padStart(digits, "0");
}

export function totpAtStep(secret: Buffer, step: number, digits: number = TOTP_DIGITS): string {
  return hotp(secret, step, digits);
}

/** Comparaison à temps constant de deux codes (longueurs différentes : refus sans fuite de contenu). */
export function constantTimeEquals(a: string, b: string): boolean {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export interface VerifyTotpInput {
  secret: Buffer;
  code: string;
  nowMs: number;
  /** Dernier pas déjà accepté pour ce compte : un pas inférieur ou égal est un rejeu et est refusé. */
  lastAcceptedStep: number | null;
}

export type VerifyTotpResult = { valid: true; step: number } | { valid: false };

/**
 * Vérifie un code dans la fenêtre ±1 pas. Les trois candidats sont toujours calculés et comparés (pas de
 * court-circuit) et la comparaison est à temps constant. Anti-rejeu : un code dont le pas est <= au dernier pas
 * accepté est refusé, même s'il est encore dans la fenêtre.
 */
export function verifyTotp(input: VerifyTotpInput): VerifyTotpResult {
  if (!/^\d{6}$/.test(input.code)) {
    return { valid: false };
  }
  const currentStep = totpStepAt(input.nowMs);
  let matchedStep: number | null = null;
  for (let delta = -TOTP_WINDOW; delta <= TOTP_WINDOW; delta += 1) {
    const step = currentStep + delta;
    const matches = constantTimeEquals(totpAtStep(input.secret, step), input.code);
    if (matches && matchedStep === null) {
      matchedStep = step;
    }
  }
  if (matchedStep === null) return { valid: false };
  if (input.lastAcceptedStep !== null && matchedStep <= input.lastAcceptedStep) return { valid: false };
  return { valid: true, step: matchedStep };
}

/** URI `otpauth://` (Key URI Format) lisible par les applications d'authentification et le QR code. */
export function buildOtpauthUri(input: { issuer: string; account: string; secret: Buffer }): string {
  const label = `${encodeURIComponent(input.issuer)}:${encodeURIComponent(input.account)}`;
  const params = new URLSearchParams({
    secret: base32Encode(input.secret),
    issuer: input.issuer,
    algorithm: "SHA1",
    digits: String(TOTP_DIGITS),
    period: String(TOTP_PERIOD_SECONDS),
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}
