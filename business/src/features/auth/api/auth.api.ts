import type { LoginFormValues } from "../schemas/login.schema";
import { recoveryCodesSchema, twoFactorSetupSchema } from "../schemas/two-factor.schema";
import type { TwoFactorSetup } from "../schemas/two-factor.schema";

interface ApiErrorBody {
  message?: string;
  code?: string;
}

/** Erreur d'une route d'authentification, avec le code métier du backend (ex. DEFI_2FA_INVALIDE). */
export class AuthApiError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "AuthApiError";
  }
}

/** Étape suivante après le mot de passe : session ouverte, code à vérifier, ou 2FA obligatoire à activer. */
export type LoginStep = "done" | "verify" | "enroll";

async function postJson(url: string, body?: unknown): Promise<unknown> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = (await response.json().catch(() => ({}))) as ApiErrorBody;
  if (!response.ok) {
    throw new AuthApiError(data.message ?? "Opération impossible.", data.code);
  }
  return data;
}

/** Appelle la Route Handler locale /api/auth/login (jamais l'API backend directement depuis le client). */
export async function login(values: LoginFormValues): Promise<LoginStep> {
  const data = (await postJson("/api/auth/login", values)) as { step?: LoginStep };
  return data.step === "verify" || data.step === "enroll" ? data.step : "done";
}

/** Seconde étape : le défi est dans un cookie httpOnly, seul le code est envoyé. */
export async function verifyTwoFactor(code: string): Promise<void> {
  await postJson("/api/auth/2fa/verify", { code });
}

export async function fetchEnrollmentSetup(): Promise<TwoFactorSetup> {
  return twoFactorSetupSchema.parse(await postJson("/api/auth/2fa/enrollment/setup"));
}

/** Confirme l'enrôlement ; la session est ouverte côté serveur, on ne reçoit que les codes de récupération. */
export async function confirmEnrollment(code: string): Promise<string[]> {
  return recoveryCodesSchema.parse(await postJson("/api/auth/2fa/enrollment/enable", { code })).recoveryCodes;
}

export async function logout(): Promise<void> {
  await fetch("/api/auth/logout", { method: "POST" });
}
