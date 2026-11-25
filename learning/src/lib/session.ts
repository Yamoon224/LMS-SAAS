import "server-only";

import { cookies } from "next/headers";

/**
 * Session côté serveur : jetons JWT dans des cookies httpOnly (jamais lisibles
 * en JS client). Noms préfixés "learning_" pour éviter toute collision avec les
 * apps admin/business sur un même domaine de base.
 */
export const ACCESS_TOKEN_COOKIE = "learning_access_token";
export const REFRESH_TOKEN_COOKIE = "learning_refresh_token";

// Alignés sur les TTL backend (JWT_ACCESS_TTL=15m, JWT_REFRESH_TTL=7d).
const ACCESS_MAX_AGE = 15 * 60;
const REFRESH_MAX_AGE = 7 * 24 * 60 * 60;

export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
}

export async function setSessionCookies(tokens: SessionTokens): Promise<void> {
  const store = await cookies();
  const base = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
  };
  store.set(ACCESS_TOKEN_COOKIE, tokens.accessToken, { ...base, maxAge: ACCESS_MAX_AGE });
  store.set(REFRESH_TOKEN_COOKIE, tokens.refreshToken, { ...base, maxAge: REFRESH_MAX_AGE });
}

export async function clearSessionCookies(): Promise<void> {
  const store = await cookies();
  store.delete(ACCESS_TOKEN_COOKIE);
  store.delete(REFRESH_TOKEN_COOKIE);
}

export async function getAccessToken(): Promise<string | undefined> {
  return (await cookies()).get(ACCESS_TOKEN_COOKIE)?.value;
}

export async function getRefreshToken(): Promise<string | undefined> {
  return (await cookies()).get(REFRESH_TOKEN_COOKIE)?.value;
}

/** Vrai si une session est (probablement) active : jeton d'accès ou de rafraîchissement présent. */
export async function hasSession(): Promise<boolean> {
  const store = await cookies();
  return store.has(ACCESS_TOKEN_COOKIE) || store.has(REFRESH_TOKEN_COOKIE);
}
