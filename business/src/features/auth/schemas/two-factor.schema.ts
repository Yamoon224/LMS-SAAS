import { z } from "zod";

/** Code TOTP : exactement 6 chiffres (cohérent avec ConfirmTwoFactorDto côté backend). */
export const totpCodeSchema = z.object({
  code: z.string().regex(/^\d{6}$/, "Saisissez les 6 chiffres affichés par l'application."),
});
export type TotpCodeValues = z.infer<typeof totpCodeSchema>;

/** Code de connexion : TOTP (6 chiffres) ou code de récupération `XXXXX-XXXXX` (tiret/espace facultatifs). */
export const verifyCodeSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^(\d{6}|[A-Za-z0-9]{5}[- ]?[A-Za-z0-9]{5})$/, "Code invalide : 6 chiffres ou code de récupération."),
});
export type VerifyCodeValues = z.infer<typeof verifyCodeSchema>;

/** Mot de passe + code (désactivation, régénération des codes de récupération). */
export const passwordAndCodeSchema = z.object({
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères."),
  code: verifyCodeSchema.shape.code,
});
export type PasswordAndCodeValues = z.infer<typeof passwordAndCodeSchema>;

export const twoFactorSetupSchema = z.object({
  secret: z.string(),
  otpauthUri: z.string(),
  qrCodeDataUrl: z.string().startsWith("data:image/"),
});
export type TwoFactorSetup = z.infer<typeof twoFactorSetupSchema>;

export const recoveryCodesSchema = z.object({ recoveryCodes: z.array(z.string()).min(1) });

export const twoFactorStatusSchema = z.object({
  enabled: z.boolean(),
  required: z.boolean(),
  recoveryCodesRemaining: z.number().int().nonnegative(),
});
export type TwoFactorStatus = z.infer<typeof twoFactorStatusSchema>;

/** Contenu du fichier de sauvegarde des codes de récupération (texte brut, un code par ligne). */
export function formatRecoveryCodesFile(codes: readonly string[], issuedAt: Date = new Date()): string {
  return [
    "Codes de récupération (double authentification)",
    `Générés le ${issuedAt.toISOString().slice(0, 10)}`,
    "Chaque code ne sert qu'une seule fois. Conservez ce fichier en lieu sûr.",
    "",
    ...codes,
    "",
  ].join("\n");
}

/** Groupe un secret Base32 par blocs de 4 pour faciliter la saisie manuelle. */
export function groupSecret(secret: string): string {
  return secret.replace(/(.{4})/g, "$1 ").trim();
}
