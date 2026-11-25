import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

/**
 * Chiffrement symétrique AES-256-GCM pour les secrets persistés (ADM-37,
 * section 11 "secrets chiffrés") : clés API des fournisseurs de paiement,
 * identifiants OAuth, etc. La clé maître vient de SECRETS_ENCRYPTION_KEY
 * (jamais committée) et est dérivée par scrypt pour obtenir 32 octets.
 */
const ALGORITHM = "aes-256-gcm";

function deriveKey(): Buffer {
  const masterKey = process.env.SECRETS_ENCRYPTION_KEY;
  if (!masterKey) {
    throw new Error("SECRETS_ENCRYPTION_KEY doit être défini pour chiffrer/déchiffrer des secrets.");
  }
  return scryptSync(masterKey, "saas-lms-secrets-salt", 32);
}

export function encryptSecret(plainText: string): string {
  const key = deriveKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString("base64"), authTag.toString("base64"), encrypted.toString("base64")].join(".");
}

export function decryptSecret(cipherText: string): string {
  const [ivB64, authTagB64, dataB64] = cipherText.split(".");
  if (!ivB64 || !authTagB64 || !dataB64) {
    throw new Error("Format de secret chiffré invalide.");
  }

  const key = deriveKey();
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(authTagB64, "base64"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}
