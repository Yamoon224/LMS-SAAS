import type { LoginFormValues } from "../schemas/auth.schema";

import type { Locale } from "@/lib/i18n/locales";
import type { Copy } from "@/lib/i18n/types";

/** Les messages affichés viennent du dictionnaire (langue courante), jamais du corps de la réponse. */
async function postJson(url: string, body: unknown, messageFor: (status: number) => string): Promise<void> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(messageFor(response.status));
}

/** Appelle les Route Handlers locales (jamais le backend directement depuis le navigateur). */
export function login(values: LoginFormValues, copy: Copy): Promise<void> {
  return postJson("/api/auth/login", values, (status) => {
    if (status === 401) return copy.auth.invalid;
    if (status === 403) return copy.auth.accountInactive;
    return copy.auth.loginFailed;
  });
}

export function activateAccount(token: string, password: string, copy: Copy): Promise<void> {
  return postJson("/api/auth/activate", { token, password }, () => copy.auth.activateFailed);
}

/** Réponse identique que le compte existe ou non : l'appelant n'apprend rien (anti-énumération). */
export function requestPasswordReset(email: string, copy: Copy): Promise<void> {
  return postJson("/api/auth/forgot-password", { email }, (status) =>
    status === 429 ? copy.auth.registerThrottled : copy.auth.forgotFailed,
  );
}

export function resetPassword(token: string, password: string, copy: Copy): Promise<void> {
  return postJson("/api/auth/reset-password", { token, password }, () => copy.auth.resetFailed);
}

export async function logout(): Promise<void> {
  await fetch("/api/auth/logout", { method: "POST" });
}

export interface RegisterInput {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

/** POST /public/auth/register via le proxy : réponse identique que le compte existe ou non (anti-énumération). */
export async function registerAccount(input: RegisterInput, copy: Copy, locale: Locale): Promise<void> {
  const response = await fetch("/api/backend/public/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...input, locale }),
  });
  if (response.status === 429) throw new Error(copy.auth.registerThrottled);
  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as { message?: string | string[] };
    const message = Array.isArray(data.message) ? data.message.join(" ") : data.message;
    throw new Error(response.status === 400 && message ? message : copy.auth.registerFailed);
  }
}
