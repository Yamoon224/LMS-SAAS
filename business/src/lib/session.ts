import "server-only";

import { cookies } from "next/headers";

/**
 * Gestion de session côté serveur (Route Handlers / Server Components).
 * Les jetons JWT (accès + rafraîchissement, section 11 "Sécurité") sont
 * stockés dans des cookies httpOnly — jamais accessibles en JS côté client,
 * contrairement à localStorage — pour limiter l'impact d'un XSS.
 *
 * Noms de cookies préfixés "business_" (distincts de ceux de l'app admin)
 * pour permettre, en production, de servir les deux apps sous des
 * sous-domaines différents du même domaine de base sans collision de cookie.
 */

const ACCESS_TOKEN_COOKIE = "business_access_token";
const REFRESH_TOKEN_COOKIE = "business_refresh_token";

// Durée de vie des cookies alignée sur les TTL par défaut du backend
// (JWT_ACCESS_TTL=15m, JWT_REFRESH_TTL=7d — voir token.service.ts).
const ACCESS_TOKEN_MAX_AGE_SECONDS = 15 * 60;
const REFRESH_TOKEN_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
}

export async function setSessionCookies(tokens: SessionTokens): Promise<void> {
  const cookieStore = await cookies();
  const isProduction = process.env.NODE_ENV === "production";

  cookieStore.set(ACCESS_TOKEN_COOKIE, tokens.accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: ACCESS_TOKEN_MAX_AGE_SECONDS,
  });

  cookieStore.set(REFRESH_TOKEN_COOKIE, tokens.refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: REFRESH_TOKEN_MAX_AGE_SECONDS,
  });
}

export async function clearSessionCookies(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ACCESS_TOKEN_COOKIE);
  cookieStore.delete(REFRESH_TOKEN_COOKIE);
}

export async function getAccessToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
}

export async function getRefreshToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;
}

export const SESSION_COOKIE_NAMES = {
  accessToken: ACCESS_TOKEN_COOKIE,
  refreshToken: REFRESH_TOKEN_COOKIE,
} as const;
